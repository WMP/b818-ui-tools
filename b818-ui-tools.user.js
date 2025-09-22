// ==UserScript==
// @name        b818-ui-tools
// @namespace   http://tampermonkey.net/
// @version     0.2
// @description The script shows the default hidden configuration options in the huawei b818 router
// @author      WMP
// @homepageURL https://github.com/WMP/b818-ui-tools
// @match       http://192.168.*/*
// @grant       none
// ==/UserScript==

'use strict';
const $ = window.jQuery || window.$;
if(!$){ console.warn('[GEMINI-UI-UNLOCK v4.2-final] jQuery not found – run on router UI page.'); return; }

try{ window.GEMINI_UI_UNLOCK_V4 && window.GEMINI_UI_UNLOCK_V4.stop && window.GEMINI_UI_UNLOCK_V4.stop(); }catch(e){}

const NS = '.gemini_ui_unlock_v4';
let observer;

function injectStyles() {
  const styleId = 'gemini-unlock-styles';
  if (document.getElementById(styleId)) return;
  const css = `
      .gemini-unlocked .control-label, .gemini-unlocked.control-label, 
      .gemini-unlocked .control-label-win, .gemini-unlocked > .control-label-win, 
      .gemini-unlocked > div > .control-label-win, [id^=apn_list_input_dns_switch_operate] .control-label-win {
          font-style: italic !important;
          color: #4a148c !important;
      }
  `;
  const style = document.createElement('style');
  style.id = styleId;
  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}

const FORCE_HIDE_SELECTORS = ['#emui_content_pop_win', '.pop_win', '#submit_fade', '.toast_location', '.modal-backdrop', '.overlay', '.submit_white_content', '.submit_black_overlay', '#confirm_light', '.page_help_info'].join(', ');
const DISCOVERY_BOUNDARY_SELECTORS = ['[id$="_page"]', '[id$="_win"]', '.out_win_content', '.submit_background'].join(', ');
const IGNORE_DROPDOWNS = '.select_list, .dropdown-menu, [role="listbox"], [role="menu"]';

const PASS_OPEN_WRAPS_SEL = '[id$="_password_open"],[id$="_wpa_key_open"],[id$="_wifi_key_open"],[id*="_pwd_open"],[id*="_pass_open"]';
const PASS_OPEN_TEXT_INPUTS_SEL = 'input[id$="_password_text"],input[id$="_wpa_key_text"],input[id$="_wifi_key_text"],input[id*="_pwd_text"],input.input_profile_user_password[type="text"]';
const PASS_CLOSE_WRAPS_SEL = '[id$="_password_close"],[id$="_wpa_key_close"],[id$="_wifi_key_close"],[id*="_pwd_close"],[id*="_pass_close"]';

const debounce = (fn, ms=250)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

function getCurrentPageRoot(){
  const PAGE_CONTAINERS = ['#rightpagearea', '#mobileconnection_page','#network_page','#wifi_page','#system_page','#settings_page','.page', '[id$="_page"]', '#add_apn_item_win'];
  for(const s of PAGE_CONTAINERS){ const $el=$(s); if($el.length && $el.is(':visible')) return $el; }
  return $('body');
}

function showEl(el){
  if(!el) return;
  const $el = $(el);
  if ($el.is(FORCE_HIDE_SELECTORS) || $el.is(DISCOVERY_BOUNDARY_SELECTORS) || $el.is(IGNORE_DROPDOWNS)) return;
  const wasHidden = $el.is(':hidden');
  el.removeAttribute?.('hidden');
  el.removeAttribute?.('aria-hidden');
  el.classList?.remove('hide', 'ng-hide', 'd-none');
  if (el.style) { el.style.setProperty('display', 'block'); el.style.setProperty('visibility', 'visible'); el.style.setProperty('opacity', '1'); }
  if (wasHidden) { $el.addClass('gemini-unlocked'); }
}

function forceHide(el){ if(!el) return; if(el.style){ el.style.setProperty('display','none','important'); el.style.setProperty('visibility','hidden','important'); } el.classList?.add('hide'); }
function forceShow(el){ if(!el) return; if(el.style){ el.style.setProperty('display','block','important'); el.style.setProperty('visibility','visible','important'); el.style.setProperty('opacity','1','important'); } el.classList?.remove('hide','ng-hide','d-none'); }

function closeDropdowns(scope){
  $(scope).find(IGNORE_DROPDOWNS).each(function(){
      const $list = $(this);
      const lastOpened = $list.data('gemini-just-opened');
      if ($list.is(':visible') && lastOpened && (Date.now() - lastOpened < 1000)) {
          return;
      }
      $list.hide();
  });
}

function keepGlobalsHidden(){ $(FORCE_HIDE_SELECTORS).each(function(){ forceHide(this); }); }

function enforcePasswordsClosed(scope){
  const $s = scope && scope.jquery ? scope : $(scope || document);
  $s.find(PASS_OPEN_WRAPS_SEL).each(function(){ forceHide(this); });
  $s.find(PASS_OPEN_TEXT_INPUTS_SEL).each(function(){ forceHide(this); });
  $s.find('.ic_eye_open').each(function(){ forceHide(this); });
  $s.find(PASS_CLOSE_WRAPS_SEL).each(function(){ forceShow(this); });
}

function revealPageOnce(){
  const $root = getCurrentPageRoot();
  if(!$root.length) return;

  const controlsSelector = 'input, select, textarea, .switch_on, .switch_off, .select_on_normal, .btn, .control-label, .control-label-win';
  $root.find(controlsSelector).filter(':hidden').each(function() {
      const $control = $(this);
      let $elementToShow = $control;
      const parents = $control.parentsUntil($root);
      for (let i = 0; i < parents.length; i++) {
          const $parent = $(parents[i]);
          if ($parent.is(':hidden')) {
              $elementToShow = $parent;
          }
      }
      if ($elementToShow.is(DISCOVERY_BOUNDARY_SELECTORS) || $elementToShow.is(FORCE_HIDE_SELECTORS)) {
          return;
      }
      showEl($elementToShow[0]);
  });

  $root.find('input, select, textarea').each(function(){
    const el = this;
    const type = (el.type || '').toLowerCase();
    if(el.hasAttribute('disabled') && type !== 'button' && type !== 'submit'){
      el.removeAttribute('disabled');
    }
  });

  keepGlobalsHidden();
  closeDropdowns($root);
  enforcePasswordsClosed($root);
}

const revealDebounced = debounce(revealPageOnce);

function setupObserver(){
    const targetNode = document.body;
    if (!targetNode) return;
    observer = new MutationObserver((mutations) => {
      let needsReveal = false;
      mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
              const $target = $(mutation.target);
              if ($target.is(IGNORE_DROPDOWNS) && $target.is(':visible')) {
                  $target.data('gemini-just-opened', Date.now());
              }
          }
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              needsReveal = true;
          }
      });
      if (needsReveal) {
          revealDebounced();
      }
    });
    observer.observe(targetNode, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
}

// Dedicated handler ONLY for dropdowns revealed by this script.
$(document).on('click'+NS, '.select_on_normal.gemini-unlocked', function() {
    const $list = $(this).siblings(IGNORE_DROPDOWNS).first();
    if (!$list.length) return;

    if ($list.is(':not(:visible)')) {
        $(IGNORE_DROPDOWNS).not($list).hide();
        $list.data('gemini-just-opened', Date.now()).show();
    } else {
        $list.removeData('gemini-just-opened').hide();
    }
});

function stop(){
  $(document).off(NS);
  if(observer) observer.disconnect();
  const style = document.getElementById('gemini-unlock-styles');
  if(style) style.remove();
  $('.gemini-unlocked').removeClass('gemini-unlocked');
  console.log('[GEMINI-UI-UNLOCK v4.2-final] stopped.');
}

window.GEMINI_UI_UNLOCK_V4 = { stop };

injectStyles();
revealPageOnce();
setTimeout(revealPageOnce, 500);
setupObserver();
console.log('[GEMINI-UI-UNLOCK v4.2-final] active.');
