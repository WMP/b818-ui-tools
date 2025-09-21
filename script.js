(()=>{'use strict';
  const $ = window.jQuery || window.$;
  if(!$){ console.warn('Brak jQuery – uruchom w panelu B818.'); return; }

  // --- Konfiguracja ---
  const MAIN = '#mobileconnection_page';
  const MODAL = '#add_apn_item_win';
  const DROPDOWNS = '.select_list, .dropdown-menu, [role="listbox"], [role="menu"]';
  const MAIN_IDS = [
    '#apn_connection_mode',
    '#apn_automatic_disconnection_time_select',
    '#apn_power_on_dialing_automatically',
    '#apn_retry_switch',
    '#apn_pdn_switch',
    '#network_mtu'
  ];
  const LOCK_CLASSES = ['disabled','disable','disabled2','check_off_disable','check_on_disable'];

  // --- Jednorazowy CSS (lekki) ---
  (function injectCSS(){
    if(document.getElementById('apnall-style')) return;
    const css = `
      /* miękko domykamy dropdowny w głównym oknie – bez !important */
      ${MAIN} ${DROPDOWNS} { display:none; }
    `;
    const st = document.createElement('style');
    st.id = 'apnall-style';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  })();

  // --- Pomocnicze: miękkie domykanie dropdownów (bez !important) ---
  function closeDropdowns(scope){
    const $scope = scope ? $(scope) : $(document);
    $scope.find(DROPDOWNS).each(function(){
      this.style && this.style.setProperty('display','none');
      this.classList && this.classList.add('hide');
    });
  }

  // --- Główne okno ---
  function revealMainOnce(){
    const $mc = $(MAIN);
    if(!$mc.length || !$mc.is(':visible')) return;

    $mc.find('#mobileconnection_display').removeClass('hide').css('display','block');
    MAIN_IDS.forEach(sel => $mc.find(sel).removeClass('hide').css('display','block'));
    closeDropdowns($mc);

    // Tryb połączenia:
    // 1) chowamy TYLKO kontener listy (bez dzieci/opcji)
    const $list  = $mc.find('#apn_connection_mode_select_list');
    $list.css('display','none').addClass('hide'); // nie ruszamy wnętrza listy

    // 2) na stałe ukrywamy blok tekstowy pod dropdownem (nie pokazujemy go w ogóle)
    const $cText = $mc.find('#connection_mode_text');
    $cText.css('display','none');
  }
  function burstMain(){ setTimeout(revealMainOnce,120); setTimeout(revealMainOnce,300); setTimeout(revealMainOnce,600); }

  // --- Modal APN (pokazujemy tylko wskazane elementy; NIE ruszamy haseł/oczek) ---
  function showEl(el){
    if(!el) return;
    el.removeAttribute && el.removeAttribute('hidden');
    el.classList && el.classList.remove('hide','ng-hide','d-none');
    el.style && el.style.setProperty('display','block');
    el.style && el.style.setProperty('visibility','visible');
    el.style && el.style.setProperty('opacity','1');
  }

  function revealModalOnce(){
    const $m = $(MODAL);
    if(!$m.length || !$m.is(':visible')) return;

    ['#ip_type','#ip_type_value','#ip_type_value_list',
     '#apn_list_input_dns_switch',
     '#profile_dns_status_table','#profile_ipv6_dns_status_table',
     '#apn_list_input_dns_operate'
    ].forEach(sel => $m.find(sel).each(function(){ showEl(this); }));

    const $sw = $m.find('#apn_list_input_dns_switch');
    if($sw.length){
      LOCK_CLASSES.forEach(c => $sw.removeClass(c));
      $sw.removeClass('check_off').addClass('check_on');
      const cb = $sw.find('input[type=checkbox]');
      if(cb.length){ cb.prop('checked', true).trigger('change'); }
    }

    closeDropdowns($m); // miękko – można otworzyć później
  }
  function burstModal(){ setTimeout(revealModalOnce,120); setTimeout(revealModalOnce,300); setTimeout(revealModalOnce,600); }

  // --- Hooki ---
  const NS = '.apnall';
  const NAV_SEL = [
    '#menu_mobileconnection',
    'a[href*="mobileconnection"]',
    '#nav_settings_internet,#nav_internet'
  ].join(',');

  $(document).off('click'+NS, NAV_SEL)
             .on('click'+NS, NAV_SEL, burstMain);

  $(document).off('click'+NS, '#add_apn_item_win .close, #add_apn_item_win [id*="cancel"], #add_apn_item_win [class*="cancel"], #add_apn_item_win .win_close, #add_apn_item_win [lang-id="common_cancel"], #add_apn_item_win [lang-id="common_ok"], #add_apn_item_win [id*="save"]')
             .on('click'+NS,  '#add_apn_item_win .close, #add_apn_item_win [id*="cancel"], #add_apn_item_win [class*="cancel"], #add_apn_item_win .win_close, #add_apn_item_win [lang-id="common_cancel"], #add_apn_item_win [lang-id="common_ok"], #add_apn_item_win [id*="save"]',
               ()=> setTimeout(burstMain, 200));

  $(document).off('click'+NS, '#apn_new')
             .on('click'+NS,  '#apn_new', burstModal);

  $(document).off('click'+NS, '#apn_lists [id^=apn_list_], #apn_lists [id^=apn_list_name_]')
             .on('click'+NS,  '#apn_lists [id^=apn_list_], #apn_lists [id^=apn_list_name_]', burstModal);

  // --- Otwieracz dropdownów (ogólny) ---
  $(document).off('click'+NS, '.select_on_normal')
             .on('click'+NS,  '.select_on_normal', function(){
                const $list = $(this).siblings('.select_list');
                if($list.length){ $list.removeClass('hide').css('display','block'); }
             });

  // --- SPECJALNY: Tryb połączenia – otwarcie listy (tekst pod spodem i tak jest wyłączony na stałe) ---
  $(document).off('click'+NS, '#apn_connection_mode_select')
             .on('click'+NS,  '#apn_connection_mode_select', function(){
                const $all  = $('#apn_connection_mode_select_all');
                const $list = $all.find('#apn_connection_mode_select_list');
                $list.removeClass('hide').css('display','block');
                // #connection_mode_text zostaje ukryty permanentnie
             });

  // --- SPECJALNY: Tryb połączenia – wybór opcji i zamknięcie listy (bez przywracania tekstu) ---
  $(document).off('click'+NS, '#apn_connection_mode_select_list .select_medium')
             .on('click'+NS,  '#apn_connection_mode_select_list .select_medium', function(){
                const $sel  = $('#apn_connection_mode_select');
                const $list = $('#apn_connection_mode_select_list');
                const opt = $(this).attr('option');
                if(typeof opt !== 'undefined'){ $sel.attr('value', String(opt)); }
                $list.addClass('hide').css('display','none');
                // nie pokazujemy #connection_mode_text
             });

  // --- Eksport ---
  window.APNALL = {
    revealMain: revealMainOnce,
    burstMain:  burstMain,
    revealModal: revealModalOnce,
    burstModal:  burstModal,
    stop: ()=>{ $(document).off(NS); const s=document.getElementById('apnall-style'); if(s) s.remove(); console.log('[APNALL] stopped'); }
  };

  // start
  burstMain();
  console.log('[APNALL] aktywny: tekst pod dropdownem Trybu połączenia ukryty od startu. Ręcznie: APNALL.revealMain(), APNALL.revealModal(), APNALL.stop()');
})();
