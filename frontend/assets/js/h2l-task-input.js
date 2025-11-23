(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null };
    const { Icon, Avatar } = Common;
    
    const getReminders = () => {
        return window.H2L && window.H2L.Reminders ? window.H2L.Reminders : {
            getPriorityColor: () => '#808080',
            SmartParser: { parse: (t) => ({ cleanTitle: t }) },
            generateHighlightHTML: (t) => t
        };
    };

    window.H2L = window.H2L || {};
    window.H2L.TaskInput = window.H2L.TaskInput || {};

    // --- 1. TODOIST DATEPICKER CLASS ---
    class TodoistDatepicker {
        constructor(wrapperElement, options = {}) {
            this.wrapper = typeof wrapperElement === 'string' ? document.getElementById(wrapperElement) : wrapperElement;
            if (!this.wrapper) return;

            this.options = options;
            this.onChange = options.onChange || function() {};

            this.renderBaseHTML();

            this.trigger = this.wrapper.querySelector('.td-trigger-btn');
            this.label = this.wrapper.querySelector('.td-label');
            this.iconHolder = this.wrapper.querySelector('.td-icon-holder');
            
            this.hDate = this.wrapper.querySelector('#h_date');
            this.hTime = this.wrapper.querySelector('#h_time');
            this.hRepeat = this.wrapper.querySelector('#h_repeat');

            this.today = new Date();
            this.today.setHours(0,0,0,0);
            this.currentViewDate = new Date(this.today);
            
            this.selectedDate = options.defaultDate ? new Date(options.defaultDate) : null;
            this.selectedTime = options.defaultTime || null;
            this.selectedRepeat = options.defaultRepeat || null;

            this.months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            this.daysShort = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
            this.daysLong = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

            this.activeMenu = null;
            this.init();
        }

        renderBaseHTML() {
            this.wrapper.innerHTML = `
                <input type="hidden" name="date" id="h_date">
                <input type="hidden" name="time" id="h_time">
                <input type="hidden" name="repeat" id="h_repeat">
                <div class="td-trigger-btn" id="td-trigger" style="height: 30px; box-sizing: border-box;">
                    <span class="td-icon-holder">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg>
                    </span>
                    <span class="td-label">Tarih</span>
                </div>
            `;
        }

        init() {
            this.createPopup();
            this.bindEvents();
            this.updateUI();
        }

        createPopup() {
            this.popup = document.createElement('div');
            this.popup.className = 'td-popup';
            this.popup.innerHTML = `
                <ul class="td-shortcuts">
                    <li class="td-shortcut-item" data-action="today">
                        <div class="td-sc-left"><div class="td-icon-box color-today" id="icon-today-dynamic"></div><span>Bugün</span></div>
                        <span class="td-sc-right">${this.getDayNameShort(this.today)}</span>
                    </li>
                    <li class="td-shortcut-item" data-action="tomorrow">
                        <div class="td-sc-left"><div class="td-icon-box color-tomorrow"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6l5.25 3.15.75-1.23-4-2.37V7z" opacity="0"/><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></div><span>Yarın</span></div>
                        <span class="td-sc-right">${this.getDayNameShort(this.addDays(this.today, 1))}</span>
                    </li>
                    <li class="td-shortcut-item" data-action="next-week">
                        <div class="td-sc-left"><div class="td-icon-box color-next"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V8h14v11z"/><path d="M12.02 17.64l3.96-3.96-1.41-1.42-1.55 1.56V10h-2v3.82l-1.55-1.56-1.42 1.42 3.97 3.96z"/></svg></div><span>Gelecek hafta</span></div>
                        <span class="td-sc-right">${this.formatDateShort(this.getNextDay(1))}</span>
                    </li>
                    <li class="td-shortcut-item" data-action="no-date" id="shortcut-no-date" style="display:none;">
                        <div class="td-sc-left"><div class="td-icon-box color-none"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.59-13L12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z"/></svg></div><span>Tarih yok</span></div>
                    </li>
                </ul>
                <div class="td-calendar">
                    <div class="td-cal-header">
                        <span class="td-month-label" id="cal-title"></span>
                        <div class="td-header-actions">
                            <div class="td-nav-btn" data-nav="-1" title="Önceki Ay"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></div>
                            <div class="td-nav-btn today-reset" title="Bugüne Dön"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" stroke-width="3" /></svg></div>
                            <div class="td-nav-btn" data-nav="1" title="Sonraki Ay"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></div>
                        </div>
                    </div>
                    <div class="td-grid">${this.daysShort.map(d => `<div class="td-day-head">${d}</div>`).join('')}</div>
                    <div class="td-grid" id="cal-body"></div>
                </div>
                <div class="td-footer">
                    <button class="td-footer-btn" id="btn-time"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span class="lbl">Zaman</span></button>
                    <button class="td-footer-btn" id="btn-repeat"><svg viewBox="0 0 24 24"><path d="M17 4v6l-2-2"/><path d="M7 20v-6l2 2"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 8l-2.74-2.74A9.75 9.75 0 0 1 12 3a9 9 0 0 1 9 9"/></svg><span class="lbl">Tekrar</span></button>
                </div>
            `;
            this.wrapper.appendChild(this.popup);
            
            this.calBody = this.popup.querySelector('#cal-body');
            this.calTitle = this.popup.querySelector('#cal-title');
            this.noDateShortcut = this.popup.querySelector('#shortcut-no-date');
            this.btnTime = this.popup.querySelector('#btn-time');
            this.btnRepeat = this.popup.querySelector('#btn-repeat');
            this.popup.querySelector('#icon-today-dynamic').innerHTML = this.getDynamicCalendarIcon(this.today.getDate());
        }

        bindEvents() {
            this.trigger.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
            this.popup.addEventListener('click', (e) => e.stopPropagation());
            
            this.outsideClickHandler = (e) => {
                if(this.activeMenu && !this.activeMenu.contains(e.target)) this.closeMenu();
                if(this.wrapper && !this.wrapper.contains(e.target) && !e.target.closest('.td-floating-menu')) this.close();
            };
            document.addEventListener('click', this.outsideClickHandler);

            this.popup.querySelectorAll('.td-nav-btn[data-nav]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.currentViewDate.setMonth(this.currentViewDate.getMonth() + parseInt(btn.dataset.nav));
                    this.renderCalendar();
                });
            });
            this.popup.querySelector('.today-reset').addEventListener('click', () => {
                this.currentViewDate = new Date(this.today);
                this.renderCalendar();
            });
            this.popup.querySelectorAll('.td-shortcut-item').forEach(item => {
                item.addEventListener('click', () => this.handleShortcut(item.dataset.action));
            });
            this.btnTime.addEventListener('click', (e) => { e.stopPropagation(); this.openTimeMenu(); });
            this.btnRepeat.addEventListener('click', (e) => { e.stopPropagation(); this.openRepeatMenu(); });
        }

        destroy() {
            document.removeEventListener('click', this.outsideClickHandler);
            if(this.popup) this.popup.remove();
            if(this.activeMenu) this.activeMenu.remove();
        }

        toggle() { this.popup.classList.contains('active') ? this.close() : this.open(); }
        open() {
            this.popup.classList.add('active');
            this.renderCalendar();
            this.noDateShortcut.style.display = this.selectedDate ? 'flex' : 'none';
        }
        close() { this.popup.classList.remove('active'); this.closeMenu(); }
        closeMenu() { if(this.activeMenu) { this.activeMenu.remove(); this.activeMenu = null; } }

        createMenu(triggerEl) {
            this.closeMenu();
            const menu = document.createElement('div');
            menu.className = 'td-floating-menu active';
            document.body.appendChild(menu);
            this.activeMenu = menu;
            const rect = triggerEl.getBoundingClientRect();
            
            menu.style.position = 'fixed';
            menu.style.left = rect.left + 'px';
            menu.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
            menu.style.top = 'auto';
            
            return menu;
        }

        openTimeMenu() {
            const menu = this.createMenu(this.btnTime);
            menu.innerHTML = `
                <div class="td-time-input-wrapper"><input type="time" class="td-time-inp" value="${this.selectedTime || ''}"></div>
                <div class="td-menu-header">Önerilenler</div>
                <div class="td-menu-item" data-time="09:00"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> 09:00 <span style="margin-left:auto;color:#999">Sabah</span></div>
                <div class="td-menu-item" data-time="13:00"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> 13:00 <span style="margin-left:auto;color:#999">Öğle</span></div>
                <div class="td-menu-item" data-time="17:00"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> 17:00 <span style="margin-left:auto;color:#999">Akşam</span></div>
                ${this.selectedTime ? `<div class="td-menu-item danger" data-time="clear"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg> Zamanı Kaldır</div>` : ''}
            `;
            menu.querySelector('.td-time-inp').addEventListener('change', (e) => { this.selectedTime = e.target.value; this.updateUI(); });
            menu.querySelectorAll('.td-menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    const t = item.dataset.time; this.selectedTime = t === 'clear' ? null : t; this.updateUI(); this.closeMenu();
                });
            });
        }

        openRepeatMenu() {
            const menu = this.createMenu(this.btnRepeat);
            menu.innerHTML = `
                <div class="td-menu-header">Tekrar Seçenekleri</div>
                <div class="td-menu-item" data-repeat="daily"><svg viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" stroke-width="2" stroke-linecap="round"/></svg> Her gün</div>
                <div class="td-menu-item" data-repeat="weekly"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Her hafta</div>
                <div class="td-menu-item" data-repeat="monthly"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Her ay</div>
                <div class="td-menu-item" data-repeat="yearly"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Her yıl</div>
                ${this.selectedRepeat ? `<div class="td-menu-item danger" data-repeat="clear"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg> Tekrarı Kaldır</div>` : ''}
            `;
            menu.querySelectorAll('.td-menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    const r = item.dataset.repeat; this.selectedRepeat = r === 'clear' ? null : r; this.updateUI(); this.closeMenu();
                });
            });
        }

        handleShortcut(action) {
            if (action === 'no-date') { this.selectedDate = null; this.selectedTime = null; this.selectedRepeat = null; }
            else if (action === 'today') { this.selectedDate = new Date(this.today); }
            else if (action === 'tomorrow') { this.selectedDate = this.addDays(this.today, 1); }
            else if (action === 'next-week') { this.selectedDate = this.getNextDay(1); }
            this.updateUI(); this.close();
        }

        selectDate(date) { this.selectedDate = date; this.updateUI(); }

        renderCalendar() {
            this.calBody.innerHTML = '';
            let startDate;
            const isCurrentMonth = this.currentViewDate.getFullYear() === this.today.getFullYear() && this.currentViewDate.getMonth() === this.today.getMonth();
            startDate = isCurrentMonth ? this.getMonday(this.today) : this.getMonday(new Date(this.currentViewDate.getFullYear(), this.currentViewDate.getMonth(), 1));
            
            const startMonth = this.months[this.currentViewDate.getMonth()];
            const startYear = this.currentViewDate.getFullYear();
            this.calTitle.textContent = `${startMonth} ${startYear}`;

            let d = new Date(startDate);
            for(let i=0; i<35; i++) {
                const cell = document.createElement('div');
                cell.className = 'td-day';
                cell.textContent = d.getDate();
                const currentIterDate = new Date(d); currentIterDate.setHours(0,0,0,0);

                if(currentIterDate.getTime() < this.today.getTime()) cell.classList.add('disabled');
                else cell.addEventListener('click', () => this.selectDate(currentIterDate));

                if (currentIterDate.getMonth() !== this.currentViewDate.getMonth() && !isCurrentMonth) cell.classList.add('other-month');
                if(currentIterDate.getDate() === 1) {
                    cell.classList.add('first-day');
                    cell.setAttribute('data-month', this.months[currentIterDate.getMonth()].substring(0,3));
                }
                if(this.isSameDay(currentIterDate, this.today)) cell.classList.add('today');
                if(this.selectedDate && this.isSameDay(currentIterDate, this.selectedDate)) cell.classList.add('selected');

                this.calBody.appendChild(cell);
                d.setDate(d.getDate() + 1);
            }
        }

        updateUI() {
            this.trigger.classList.remove('is-today', 'is-tomorrow', 'is-next-week', 'is-date');
            
            if(this.selectedTime) { this.btnTime.classList.add('has-value'); this.btnTime.querySelector('.lbl').textContent = this.selectedTime; }
            else { this.btnTime.classList.remove('has-value'); this.btnTime.querySelector('.lbl').textContent = 'Zaman'; }

            if(this.selectedRepeat) { 
                this.btnRepeat.classList.add('has-value'); 
                const rMap = {daily:'Her gün', weekly:'Haftalık', monthly:'Aylık', yearly:'Her yıl'};
                this.btnRepeat.querySelector('.lbl').textContent = rMap[this.selectedRepeat] || 'Tekrar';
            } else { this.btnRepeat.classList.remove('has-value'); this.btnRepeat.querySelector('.lbl').textContent = 'Tekrar'; }

            if (!this.selectedDate) {
                this.label.textContent = "Tarih";
                this.iconHolder.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg>`;
                this.hDate.value = "";
            } else {
                const result = this.getSmartDateLabel(this.selectedDate);
                let labelHTML = `<span>${result.text}</span>`;
                if (this.selectedTime) labelHTML += ` <span>${this.selectedTime}</span>`;
                if (this.selectedRepeat) {
                    labelHTML += `<svg class="td-repeat-icon" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" stroke-width="2" stroke-linecap="round"/></svg>`;
                }
                this.label.innerHTML = labelHTML;
                this.trigger.classList.add(result.class);
                this.iconHolder.innerHTML = result.icon;
                const y = this.selectedDate.getFullYear();
                const m = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
                const d = String(this.selectedDate.getDate()).padStart(2, '0');
                this.hDate.value = `${y}-${m}-${d}`;
            }
            
            if(this.popup.classList.contains('active')) this.renderCalendar();

            if (this.onChange) {
                let isoDate = null;
                if (this.selectedDate) {
                    const y = this.selectedDate.getFullYear();
                    const m = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
                    const d = String(this.selectedDate.getDate()).padStart(2, '0');
                    isoDate = `${y}-${m}-${d}`;
                }
                this.onChange({ date: isoDate, time: this.selectedTime, repeat: this.selectedRepeat });
            }
        }

        getSmartDateLabel(date) {
            const tomorrow = this.addDays(this.today, 1);
            const diffTime = date - this.today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            if (this.isSameDay(date, this.today)) return { text: "Bugün", class: "is-today", icon: this.getDynamicCalendarIcon(date.getDate()) };
            if (this.isSameDay(date, tomorrow)) return { text: "Yarın", class: "is-tomorrow", icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6l5.25 3.15.75-1.23-4-2.37V7z" opacity="0"/><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>` };
            if (diffDays > 0 && diffDays < 7) return { text: this.daysLong[date.getDay()], class: "is-next-week", icon: this.getDynamicCalendarIcon(date.getDate()) };
            return { text: `${date.getDate()} ${this.months[date.getMonth()].substring(0,3)}`, class: "is-date", icon: this.getDynamicCalendarIcon(date.getDate()) };
        }

        getDynamicCalendarIcon(dayNum) {
            return `<svg viewBox="0 0 24 24" class="dynamic-calendar-icon" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/><text x="12" y="19" text-anchor="middle" fill="${this.isSameDay(this.selectedDate, this.today) || !this.selectedDate ? 'currentColor' : '#fff'}" style="font-size:10px; font-family:sans-serif; font-weight:700;">${dayNum}</text></svg>`;
        }
        
        addDays(d, n) { const z=new Date(d); z.setDate(z.getDate()+n); return z; }
        getNextDay(dayIdx) { const d=new Date(); d.setDate(d.getDate() + (dayIdx + 7 - d.getDay()) % 7); if(d<=new Date()) d.setDate(d.getDate()+7); return d; }
        isSameDay(a, b) { return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
        getDayNameShort(d) { return this.daysShort[(d.getDay()+6)%7]; }
        formatDateShort(d) { return `${d.getDate()} ${this.months[d.getMonth()].substring(0,3)}`; }
        getMonday(d) { d = new Date(d); var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1); return new Date(d.setDate(diff)); }
    }

    const PLACEHOLDERS = [
         "Kampanya kurulumu ekleyin… ör. yarın 10:00 #DV360 p1",
        "Müşteri onayı iste… @selim bugün 15:00",
        "Günlük optimizasyon görevi… her gün 09:30 #MetaAds",
        "Teklif hazırlama… 2 gün sonra >Satış @berkay",
        "Story tasarımı ekleyin… bugün 17:00 p2",
        "Kreatif revize iste… @özge yarın sabah",
        "IION kurulum kontrolü… >Analitik p1",
        "Aylık performans raporu… her ayın 1’i #Raporlama",
        "Müşteri toplantısı ekleyin… cuma 14:00",
        "Kampanya bütçe güncellemesi… 5 şubat 10:00",
        "Yeni reklam metni yaz… @cemre #Kreatif",
        "Rakip analizi planla… 3 gün sonra p2",
        "DV360 yayına alma… yarın 08:00 p1",
        "Kampanya durdurma talebi… bugün 18:00",
        "Influencer seçimi… >SosyalMedya @elifnaz",
        "Fatura talebi oluştur… #Muhasebe p1",
        "Etiketleme (GTM) görevi… 12/2 saat 16:00",
        "Haftalık durum toplantısı… her cuma >Toplantılar",
        "Kreatif çıkışları kontrol et… 4pm @oğuz",
        "Landing page revizesi… yarına ertele #Web",
        "KPI kontrolü ekle… >Performans bugün p1",
        "Müşteri geri dönüşlerini toparla… @süleyman",
        "Yeni proje kaydı aç… #YeniMüşteri",
        "Maliyet optimizasyonu… 2 hafta sonra p2",
        "Rapor gönderimi… bugün 11:00 @selim",
        "Video reklam çıkışı… 3 gün sonra @özge",
        "Reklam reddi çözümü… bugün >Acil p1",
        "Strateji dokümanı hazırla… pazartesi 10:00",
        "Tracking testleri yap… yarın 14:30 >Analitik",
        "Kampanya kalite kontrol… her hafta içi 09:00",
        "UTM parametrelerini oluştur… bugün #Analitik",
        "Yaratıcı konsept hazırlanması… @özge yarın",
        "CRM datasını güncelle… #Müşteri",
        "Banner adaptasyonları… 2 gün sonra p2",
        "Budget pacing kontrolü… >Performans",
        "Sosyal medya içerik planı… her pazartesi",
        "Müşteri SLA kontrolü… yarın sabah",
        "A/B test kurulumu… cuma 11:00",
        "Kampanya yayını izleme… her gün 10:00",
        "Reklam metni varyasyonları oluştur… bugün @cemre",
        "Segment oluşturma… #Programmatic",
        "Yeni hedef kitle tanımı… 2 gün sonra",
        "Tag Manager publish… bugün 17:00 p1",
        "Creative approval follow-up… @selim",
        "Yayın durumu raporla… gelecek hafta",
        "Meta Ads retest… yarın öğleden sonra",
        "Lookalike audience ekle… #MetaAds",
        "Video kurgusu hazırlansın… @özge cuma 15:00",
        "Data Studio dashboard güncelle… bugün",
        "Remarketing listeleri kontrol… her salı",
        "Konum hedefleme düzenle… #GoogleAds",
        "CAPI entegrasyonu test et… @berkay",
        "Ürün feed kontrolü… >E-ticaret",
        "Kreatif teslim tarihini netleştir… @cemre",
        "Reklam harcaması kontrolü… bugün 17:00",
        "Yayın optimizasyon notu ekle… p2",
        "Erişim frekans kontrolü… yarın sabah",
        "Brief dokümanı paylaş… @süleyman",
        "Müşteri önerilerini takip et… #Müşteri",
        "Video thumbnail düzenle… 4pm @özge",
        "Sosyal medya raporu hazırla… cuma 17:00",
        "Kreatif yönlendirme hazırla… #KreatifBrief",
        "Kampanya hedeflerini güncelle… >Strateji",
        "Yedek reklam grubu oluştur… @berkay",
        "Ürün setlerini güncelle… #CatalogAds",
        "Email automation testi… yarın 10:00",
        "Atribüsyon modeli kontrol… #Analitik",
        "Theadx kreatif ekleme sorunu çöz… p1 @alper",
        "Adform Ads kurulumu… @cemre",
        "Yayın sonrası performans değerlendirmesi… gelecek pazartesi",
        "Müşteriden missing asset iste… bugün",
        "Conversion tracking doğrula… 12:00 p1",
        "Kampanya maliyet tahmini oluştur… #Planlama",
        "Cross-channel kontrol… perşembe",
        "Reklam yöneticisinde hata giderme… bugün >Acil",
        "Rakip banner görsellerini topla… @elifnaz",
        "Creative X çıkış kontrolü… gün içinde",
        "Story & Reel planlama… #SosyalMedya",
        "Yayın, harcama ve pacing uyumu kontrol… p2",
        "Google DV360 kalite puanı artırma görevi… yarın",
        "GAM Ads kur… >B2B @süleyman",
        "Kampanya döviz kuruna göre düzeltme… #Finans",
        "YouTube bumper hazırlığı… bugün",
        "Hedef kitle temizliği… 2 hafta sonra",
        "Yeni müşteri onboarding akışı… #CRM",
        "Ajans içi not ekle… @selim",
        "İçerik revize takip… @cemre",
        "Finansal döküman gönder… #Muhasebe",
        "Müşteri feedback dokümanı oluştur… >Müşteriİlişkileri",
        "DV360 event mapping güncelle… p1",
        "Performance Max görsel kontrolü… bugün",
        "Hesap güvenlik kontrolü… #Admin",
        "Yayın harcama limiti ayarla… @berkay",
        "Müşteri blacklist/whitelist düzenle… #Programmatic",
        "Kreatif test planı oluştur… yarın p3",
        "Yayın içgörüleri topla… cuma",
        "Toplantı özetini yaz… @selim bugün",
        "Feed optimizasyonu… 3 gün sonra",
        "Etiket düzeni kontrol et… #GTM",
        "Yayın hatalarını tara… >Performans p1"
    ];

    const getRandomPlaceholder = () => {
        return PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];
    };

    const sanitizeHTML = (html) => {
        if (!html) return '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const allowedTags = ['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'CODE', 'A', 'SPAN', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'LI'];
        const clean = (node) => {
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                const child = node.childNodes[i];
                if (child.nodeType === 1) {
                    const tagName = child.tagName;
                    if (!allowedTags.includes(tagName)) {
                        if (['DIV', 'P', 'BR', 'TR'].includes(tagName)) node.insertBefore(document.createTextNode(' '), child);
                        while (child.firstChild) node.insertBefore(child.firstChild, child);
                        node.removeChild(child);
                    } else {
                        const attrs = Array.from(child.attributes);
                        for (const attr of attrs) {
                            const name = attr.name.toLowerCase();
                            if (tagName === 'A' && (name === 'href' || name === 'target')) continue;
                            if (tagName === 'SPAN' && name === 'class' && attr.value.includes('h2l-highlight-tag')) continue;
                            child.removeAttribute(name);
                        }
                        if (tagName === 'A') child.setAttribute('target', '_blank');
                        clean(child);
                    }
                }
            }
        };
        clean(doc.body);
        return doc.body.innerHTML.replace(/&nbsp;/g, ' ').trim();
    };

    const DatePickerWrapper = ({ date, time, repeat, onChange }) => {
        const wrapperRef = useRef(null);
        const pickerRef = useRef(null);

        useEffect(() => {
            if (wrapperRef.current && !pickerRef.current) {
                pickerRef.current = new TodoistDatepicker(wrapperRef.current, {
                    defaultDate: date,
                    defaultTime: time,
                    defaultRepeat: repeat,
                    onChange: onChange
                });
            }
            return () => { if (pickerRef.current && pickerRef.current.destroy) pickerRef.current.destroy(); };
        }, []);

        useEffect(() => {
            if (pickerRef.current) {
                if (date) pickerRef.current.selectedDate = new Date(date);
                else pickerRef.current.selectedDate = null;
                pickerRef.current.selectedTime = time;
                pickerRef.current.selectedRepeat = repeat;
                if (pickerRef.current.updateUI) pickerRef.current.updateUI();
            }
        }, [date, time, repeat]);

        return el('div', { ref: wrapperRef, className: 'td-popup-wrapper', style: { marginRight: 0 } });
    };

    const PasteModal = ({ lines, onConfirm, onCancel }) => {
        const [merge, setMerge] = useState(false);
        const taskCount = lines.length;
        return el('div', { className: 'h2l-paste-modal-overlay', onClick: onCancel },
            el('div', { className: 'h2l-paste-modal', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-paste-header' }, el('h3', null, merge ? '1 görev eklensin mi?' : `${taskCount} görev eklensin mi?`)),
                el('div', { className: 'h2l-paste-body' },
                    el('p', null, merge ? 'Yapıştırdığın metin birleştirilerek tek bir görev olarak eklenecek.' : 'Yapıştırdığın metnin her bir satırı ayrı bir görev olarak eklenecek.'),
                    el('div', { className: 'h2l-paste-preview' }, lines.slice(0, 3).map((line, i) => el('div', { key: i, className: 'h2l-preview-line' }, el('span', {className:'bullet'}, '•'), el('span', null, line.substring(0, 50) + (line.length>50?'...':'')))), lines.length > 3 && el('div', { className: 'h2l-preview-more' }, `... ve ${lines.length - 3} satır daha`))
                ),
                el('div', { className: 'h2l-paste-footer' },
                    el('label', { className: 'h2l-paste-checkbox' }, el('input', { type: 'checkbox', checked: merge, onChange: e => setMerge(e.target.checked) }), ' Tek görevde birleştir'),
                    el('div', { className: 'h2l-paste-actions' }, el('button', { className: 'h2l-btn text-cancel', onClick: onCancel }, 'İptal'), el('button', { className: 'h2l-btn primary', onClick: () => onConfirm(merge) }, merge ? 'Görevi ekle' : `${taskCount} görev ekle`))
                )
            )
        );
    };

    const ContentEditable = ({ html, onChange, placeholder, className, autoFocus, onKeyDown, onPasteIntent, onInputHighlight }) => {
        const contentEditableRef = useRef(null);
        const lastHtml = useRef(null);

        useEffect(() => { 
            if (contentEditableRef.current && html !== contentEditableRef.current.innerHTML && html !== lastHtml.current) { 
                contentEditableRef.current.innerHTML = html; lastHtml.current = html;
            } 
        }, [html]); 
        
        useEffect(() => { if (autoFocus && contentEditableRef.current) { contentEditableRef.current.focus(); } }, []);

        const handleInput = (e) => { 
            let newHtml = e.target.innerHTML;
            const textContent = e.target.textContent || ""; 
            if (textContent.trim() === "" && (!newHtml || newHtml === "<br>" || newHtml === "<div><br></div>")) { newHtml = ""; e.target.innerHTML = ""; }
            lastHtml.current = newHtml; onChange(newHtml); 
        };

        const handleKeyUp = (e) => {
            if ([' ', 'Enter', 'Backspace', 'Delete'].includes(e.key) && onInputHighlight) onInputHighlight(contentEditableRef.current);
        };

        const handleKeyDownLocal = (e) => { if (onKeyDown) onKeyDown(e); };
        
        const handlePasteLocal = (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            const htmlContent = e.clipboardData.getData('text/html');
            const lines = text.split(/\r\n|\r|\n/).filter(line => line.trim().length > 0);
            if (lines.length > 1 && onPasteIntent) onPasteIntent(lines, htmlContent); 
            else { 
                let contentToInsert = htmlContent ? sanitizeHTML(htmlContent) : text; 
                document.execCommand('insertHTML', false, contentToInsert); 
            }
        };

        return el('div', { 
            ref: contentEditableRef, 
            className: `h2l-content-editable ${className}`, 
            contentEditable: true, onInput: handleInput, onKeyDown: handleKeyDownLocal, onKeyUp: handleKeyUp, onPaste: handlePasteLocal, 
            'data-placeholder': placeholder, suppressContentEditableWarning: true, 
            dir: "ltr", style: { direction: 'ltr', textAlign: 'left', unicodeBidi: 'normal', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } 
        });
    };

    const TextTooltip = ({ position, onFormat, showLinkInput, onLinkSubmit, onClose, type = 'basic' }) => {
        const [linkUrl, setLinkUrl] = useState('');
        const inputRef = useRef(null);
        useEffect(() => { if (showLinkInput && inputRef.current) inputRef.current.focus(); }, [showLinkInput]);
        if (!position) return null;
        
        const handleLinkKey = (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); onLinkSubmit(linkUrl); } 
            if (e.key === 'Escape') { e.preventDefault(); onClose(); } 
        };

        const renderButtons = () => {
            if (showLinkInput) {
                return el('div', { className: 'h2l-tooltip-link-area' }, 
                    el('input', { ref: inputRef, className: 'h2l-tooltip-input', placeholder: 'https://...', value: linkUrl, onChange: e => setLinkUrl(e.target.value), onKeyDown: handleLinkKey }), 
                    el('button', { className: 'h2l-tooltip-btn action', onClick: () => onLinkSubmit(linkUrl) }, el(Icon, {name:'check'})), 
                    el('button', { className: 'h2l-tooltip-btn action', onClick: onClose }, el(Icon, {name:'xmark'}))
                );
            }
            
            const buttons = [
                el('button', { key:'b', className: 'h2l-tooltip-btn', title:'Kalın', onClick: () => onFormat('bold') }, el(Icon, {name:'bold'})), 
                el('button', { key:'i', className: 'h2l-tooltip-btn', title:'İtalik', onClick: () => onFormat('italic') }, el(Icon, {name:'italic'})), 
                el('button', { key:'u', className: 'h2l-tooltip-btn', title:'Altı Çizili', onClick: () => onFormat('underline') }, el(Icon, {name:'underline'})), 
                el('button', { key:'s', className: 'h2l-tooltip-btn', title:'Üstü Çizili', onClick: () => onFormat('strikethrough') }, el(Icon, {name:'strikethrough'})), 
                el('button', { key:'code', className: 'h2l-tooltip-btn', title:'Kod', onClick: () => onFormat('code') }, el(Icon, {name:'code'}))
            ];

            if (type === 'advanced') {
                buttons.push(
                    el('div', { key:'sep1', className: 'h2l-tooltip-divider' }),
                    el('button', { key:'h1', className: 'h2l-tooltip-btn', title:'Başlık 1', onClick: () => onFormat('formatBlock', 'H1') }, 'H1'),
                    el('button', { key:'h2', className: 'h2l-tooltip-btn', title:'Başlık 2', onClick: () => onFormat('formatBlock', 'H2') }, 'H2'),
                    el('button', { key:'quote', className: 'h2l-tooltip-btn', title:'Alıntı', onClick: () => onFormat('formatBlock', 'BLOCKQUOTE') }, el(Icon, {name:'quote-right'})),
                    el('button', { key:'ul', className: 'h2l-tooltip-btn', title:'Liste', onClick: () => onFormat('insertUnorderedList') }, el(Icon, {name:'list-ul'})),
                    el('button', { key:'ol', className: 'h2l-tooltip-btn', title:'Sıralı Liste', onClick: () => onFormat('insertOrderedList') }, el(Icon, {name:'list-ol'}))
                );
            }
            buttons.push(
                el('div', { key:'sep_link', className: 'h2l-tooltip-divider' }), 
                el('button', { key:'l', className: 'h2l-tooltip-btn', title:'Link', onClick: () => onFormat('link_prompt') }, el(Icon, {name:'link'}))
            );
            return buttons;
        };
        
        return el('div', { className: 'h2l-tooltip-popover', style: { left: position.left, top: position.top }, onMouseDown: e => e.stopPropagation() }, renderButtons());
    };

    const TaskEditor = ({ mode = 'add', initialData = {}, users = [], projects = [], sections = [], activeProjectId = 0, onSave, onCancel }) => {
        const [title, setTitle] = useState(initialData.title || '');
        const [description, setDescription] = useState(initialData.content || '');
        const [currentPlaceholder, setCurrentPlaceholder] = useState(mode === 'add' ? getRandomPlaceholder() : 'Görev adı');
        const [priority, setPriority] = useState(initialData.priority || 4);
        const [assigneeIds, setAssigneeIds] = useState(initialData.assignees || []);
        const [dueDate, setDueDate] = useState(initialData.due_date ? initialData.due_date.split(' ')[0] : '');
        const [dueTime, setDueTime] = useState(initialData.due_date && initialData.due_date.includes(' ') ? initialData.due_date.split(' ')[1].substring(0, 5) : '');
        const [repeat, setRepeat] = useState(initialData.repeat || null);
        const [status, setStatus] = useState(initialData.status || 'open');
        const [projectId, setProjectId] = useState(initialData.project_id || activeProjectId);
        const [sectionId, setSectionId] = useState(initialData.section_id || null);
        const [activePopup, setActivePopup] = useState(null);
        const [tooltipState, setTooltipState] = useState(null);
        const [pasteLines, setPasteLines] = useState(null);
        const [assigneeSearch, setAssigneeSearch] = useState(''); 
        
        const savedSelectionRange = useRef(null);
        const wrapperRef = useRef(null);
        const MAX_CHARS = 500;

        const plainTitle = title ? title.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : '';
        const isLimitExceeded = plainTitle.length > MAX_CHARS;

        const saveCaret = (el) => {
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return null;
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(el);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            return preCaretRange.toString().length;
        };

        const restoreCaret = (el, offset) => {
            if (offset === null) return;
            const selection = window.getSelection();
            const range = document.createRange();
            let currentPos = 0, nodeStack = [el], node, found = false;
            while (!found && (node = nodeStack.pop())) {
                if (node.nodeType === 3) {
                    const nextPos = currentPos + node.length;
                    if (offset >= currentPos && offset <= nextPos) {
                        range.setStart(node, offset - currentPos); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); found = true;
                    }
                    currentPos = nextPos;
                } else { let i = node.childNodes.length; while (i--) nodeStack.push(node.childNodes[i]); }
            }
        };

        const handleHighlight = (el) => {
            const { generateHighlightHTML } = getReminders();
            const currentHtml = el.innerHTML;
            const newHtml = generateHighlightHTML(currentHtml);
            if (currentHtml !== newHtml) {
                const caret = saveCaret(el); el.innerHTML = newHtml; restoreCaret(el, caret); setTitle(newHtml);
            }
        };

        // Smart Parser (Düzeltilmiş: Tüm Mentionları Yakala)
        useEffect(() => {
            if (!title || title.replace(/<[^>]*>/g, '').trim().length < 2) return;
            const plainText = title.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
            const { SmartParser } = getReminders();
            
            if (SmartParser && SmartParser.parse) {
                // Proje Üyelerini Filtrele
                let eligibleUsers = users;
                if (projectId) {
                    const currentProj = projects.find(p => parseInt(p.id) === parseInt(projectId));
                    if (currentProj) {
                        let mgrs = currentProj.managers || [];
                        if (typeof mgrs === 'string') mgrs = JSON.parse(mgrs);
                        const pMembers = [parseInt(currentProj.owner_id), ...mgrs.map(id => parseInt(id))].filter(Boolean);
                        eligibleUsers = users.filter(u => pMembers.includes(parseInt(u.id)));
                    }
                }

                const result = SmartParser.parse(plainText, projects, eligibleUsers, sections);
                
                if (result.priority) setPriority(result.priority);
                
                // ÇOKLU MENTION YAKALAMA
                const mentionRegex = /(?:^|\s)@([\w\u00C0-\u017F]{2,})/gi;
                const foundIds = [];
                let m;
                while ((m = mentionRegex.exec(plainText)) !== null) {
                    const search = m[1].toLowerCase();
                    const user = eligibleUsers.find(u => u.name.toLowerCase().includes(search));
                    if (user) foundIds.push(user.id);
                }
                // Tekrarları önle ve state'i güncelle
                if (foundIds.length > 0) {
                    setAssigneeIds([...new Set(foundIds)]);
                }

                if (result.dueDate) {
                    const parts = result.dueDate.split(' ');
                    setDueDate(parts[0]);
                    if(parts[1]) setDueTime(parts[1]);
                }
                if (result.projectId) setProjectId(result.projectId);
                if (result.sectionId) setSectionId(result.sectionId);
            }
        }, [title, users, projects, sections, projectId]);

        useEffect(() => { 
            const handleClickOutside = (event) => { 
                if (wrapperRef.current && !wrapperRef.current.contains(event.target)) { 
                    if(!event.target.closest('.h2l-tooltip-popover') && !event.target.closest('.td-floating-menu')) setActivePopup(null); 
                } 
            }; 
            document.addEventListener("mousedown", handleClickOutside); 
            return () => document.removeEventListener("mousedown", handleClickOutside); 
        }, [wrapperRef]);
        
        useEffect(() => { 
            const handleSelection = () => { 
                const selection = window.getSelection(); 
                if (!selection.isCollapsed && wrapperRef.current && wrapperRef.current.contains(selection.anchorNode)) { 
                    const range = selection.getRangeAt(0); const rect = range.getBoundingClientRect();
                    let type = 'basic'; let node = selection.anchorNode; if(node.nodeType === 3) node = node.parentElement;
                    if (node.closest('.desc-mode')) type = 'advanced';
                    setTooltipState(prev => prev && prev.showLinkInput ? prev : { pos: { left: rect.left + (rect.width / 2) - 100, top: rect.top - 50 }, showLinkInput: false, type }); 
                } else { setTooltipState(prev => prev && prev.showLinkInput ? prev : null); } 
            }; 
            document.addEventListener('selectionchange', handleSelection); return () => document.removeEventListener('selectionchange', handleSelection); 
        }, []);

        const handlePasteConfirm = (merge) => {
            if (!pasteLines) return;
            if (merge) {
                const mergedText = pasteLines.join(' ');
                const titleEl = wrapperRef.current.querySelector('.h2l-content-editable.title-mode');
                if(titleEl) titleEl.focus(); document.execCommand('insertHTML', false, mergedText);
            } else {
                const { SmartParser } = getReminders();
                pasteLines.forEach(line => {
                    const parsed = SmartParser.parse(line, projects, users, sections);
                    const taskData = { title: line, priority: parsed.priority || priority, assignees: parsed.assigneeId ? [parsed.assigneeId] : [], dueDate: parsed.dueDate || dueDate, projectId: parsed.projectId || projectId, sectionId: parsed.sectionId || sectionId, status: 'open' };
                    onSave(taskData);
                });
                if(mode === 'add') { setTitle(''); setDescription(''); setCurrentPlaceholder(getRandomPlaceholder()); }
                if(onCancel) onCancel();
            }
            setPasteLines(null);
        };

        const handleSubmit = () => {
            const finalPlainTitle = title.replace(/<[^>]*>/g, '').trim();
            if(finalPlainTitle && finalPlainTitle.length <= MAX_CHARS) {
                let finalDueDate = dueDate; if(dueDate && dueTime) finalDueDate = `${dueDate} ${dueTime}:00`;
                const taskData = { id: initialData.id, title, content: description, priority, assignees: assigneeIds, dueDate: finalDueDate, repeat, status, projectId, sectionId };
                onSave(taskData);
                if(mode === 'add') { 
                    setTitle(''); setDescription(''); setPriority(4); setAssigneeIds([]); setDueDate(''); setDueTime(''); setRepeat(null);
                    setCurrentPlaceholder(getRandomPlaceholder());
                    const titleEl = wrapperRef.current.querySelector('.h2l-content-editable.title-mode'); if(titleEl) titleEl.innerHTML = ''; 
                }
            }
        };

        const handleFormat = (type, value = null) => { 
            if (type === 'link_prompt') { 
                const selection = window.getSelection(); if (selection.rangeCount > 0) savedSelectionRange.current = selection.getRangeAt(0); 
                setTooltipState(prev => ({ ...prev, showLinkInput: true })); 
            } else if (type === 'code') {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const code = document.createElement('code');
                    code.textContent = selection.toString();
                    range.deleteContents();
                    range.insertNode(code);
                }
            } else document.execCommand(type, false, value);
        };

        const handleLinkSubmit = (url) => { 
            if (url) { 
                const selection = window.getSelection(); selection.removeAllRanges(); 
                if (savedSelectionRange.current) selection.addRange(savedSelectionRange.current); 
                document.execCommand('createLink', false, url); 
                if (selection.anchorNode && selection.anchorNode.parentElement.tagName === 'A') selection.anchorNode.parentElement.setAttribute('target', '_blank'); 
            } 
            setTooltipState(null); savedSelectionRange.current = null; 
        };
        
        const handleKeyDown = (e) => { 
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); handleFormat('bold'); } 
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } 
            if (e.key === 'Escape') onCancel(); 
        };

        const { getPriorityColor } = getReminders();
        const selectedProject = projects.find(p => parseInt(p.id) === parseInt(projectId));

        const renderAssigneeLabel = () => {
            if (assigneeIds.length === 0) return [el(Icon, {name:'user'}), 'Atanan'];
            const firstUser = users.find(u => u.id == assigneeIds[0]);
            if (!firstUser) return [el(Icon, {name:'user'}), 'Bilinmeyen'];
            const elements = [el(Avatar, { userId: firstUser.id, users, size: 16, style: { marginRight: 6, verticalAlign:'middle' } }), firstUser.name];
            if (assigneeIds.length > 1) elements.push(el('span', { style: { marginLeft: 4, fontWeight: 'bold', color: '#777' } }, `+${assigneeIds.length - 1}`));
            return elements;
        };

        const renderPopup = () => {
            if (!activePopup) return null;
            const popupStyle = { top: '100%', left: 0, marginTop: 5 };
            
            if (activePopup === 'assignee') {
                let eligibleUsers = users;
                if (selectedProject) {
                    let mgrs = selectedProject.managers || [];
                    if (typeof mgrs === 'string') mgrs = JSON.parse(mgrs);
                    const pMembers = [parseInt(selectedProject.owner_id), ...mgrs.map(id => parseInt(id))].filter(Boolean);
                    eligibleUsers = users.filter(u => pMembers.includes(parseInt(u.id)));
                }
                const filteredUsers = eligibleUsers.filter(u => u.name.toLowerCase().includes(assigneeSearch.toLowerCase()));
                const displayUsers = filteredUsers.slice(0, 5);

                return el('div', { className: 'h2l-popover-menu', style: { ...popupStyle, width: 260 } }, 
                    el('div', { style: { padding: '8px 12px 4px' } },
                        el('input', { type: 'text', placeholder: 'Kişi ara...', value: assigneeSearch, autoFocus: true, onChange: e => setAssigneeSearch(e.target.value), onClick: e => e.stopPropagation(), style: { width: '100%', padding: '6px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '4px', outline: 'none' } })
                    ),
                    el('div', { className: 'h2l-menu-item', onClick: () => { setAssigneeIds([]); } }, el(Icon, { name: 'user-xmark', style: { marginRight: 8, color: '#888' } }), 'Atanmamış', assigneeIds.length === 0 && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } })),
                    displayUsers.map(u => {
                        const isSelected = assigneeIds.some(id => parseInt(id) === parseInt(u.id));
                        return el('div', { key: u.id, className: 'h2l-menu-item', onClick: (e) => { e.stopPropagation(); const newIds = isSelected ? assigneeIds.filter(id => parseInt(id) !== parseInt(u.id)) : [...assigneeIds, u.id]; setAssigneeIds(newIds); } }, el(Avatar, { userId: u.id, users, size: 20, style: { marginRight: 8 } }), u.name, isSelected && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }));
                    }),
                    displayUsers.length === 0 && el('div', { style: { padding: '10px', fontSize: '12px', color: '#999', textAlign: 'center' } }, 'Kullanıcı bulunamadı'),
                    el('div', { style: { height: 1, background: '#f0f0f0', margin: '4px 0' } }),
                    el('div', { className: 'h2l-menu-item', onClick: () => document.dispatchEvent(new CustomEvent('h2l_open_share_menu')) }, el(Icon, { name: 'user-plus', style: { marginRight: 8, color: '#888' } }), 'Projeye davet et')
                );
            }

            if (activePopup === 'priority') return el('div', { className: 'h2l-popover-menu', style: popupStyle }, [1, 2, 3, 4].map(p => el('div', { key: p, className: 'h2l-menu-item', onClick: () => { setPriority(p); setActivePopup(null); } }, el(Icon, { name: 'flag', style: { color: getPriorityColor(p), marginRight: 8 } }), `Öncelik ${p}`, priority === p && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'status') return el('div', { className: 'h2l-popover-menu', style: popupStyle }, Object.keys({'open':'Açık','in_progress':'Devam Ediyor','completed':'Tamamlandı'}).map(k => el('div', { key: k, className: 'h2l-menu-item', onClick: () => { setStatus(k); setActivePopup(null); } }, el(Icon, { name: k === 'completed' ? 'check-circle' : 'circle', style: { marginRight: 8, color: '#888' } }), {'open':'Açık','in_progress':'Devam Ediyor','completed':'Tamamlandı'}[k], status === k && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'project') return el('div', { className: 'h2l-popover-menu', style: { bottom: '100%', top: 'auto', marginBottom: 5, left: 0 } }, el('div', { className: 'h2l-menu-title' }, 'Proje Seç'), projects.map(p => el('div', { key: p.id, className: 'h2l-menu-item', onClick: () => { setProjectId(p.id); setActivePopup(null); } }, el('span', { style: { color: p.color, marginRight: 8, fontSize: 14 } }, '#'), p.title, parseInt(projectId) === parseInt(p.id) && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            return null;
        };

        const handleDateChange = (data) => { setDueDate(data.date); setDueTime(data.time); setRepeat(data.repeat); };

        return el('div', { className: 'h2l-todoist-editor-wrapper', ref: wrapperRef },
            tooltipState && el(TextTooltip, { position: tooltipState.pos, showLinkInput: tooltipState.showLinkInput, onFormat: handleFormat, onLinkSubmit: handleLinkSubmit, onClose: () => setTooltipState(null), type: tooltipState.type }),
            pasteLines && el(PasteModal, { lines: pasteLines, onConfirm: handlePasteConfirm, onCancel: () => setPasteLines(null) }),

            el('div', { className: 'h2l-todoist-editor-body' },
                el(ContentEditable, { html: title, onChange: setTitle, placeholder: currentPlaceholder, className: 'title-mode', autoFocus: true, onKeyDown: handleKeyDown, onPasteIntent: (lines) => setPasteLines(lines), onInputHighlight: handleHighlight }),
                el(ContentEditable, { html: description, onChange: setDescription, placeholder: 'Açıklama', className: 'desc-mode', onPasteIntent: (lines, html) => document.execCommand('insertHTML', false, html || lines.join('\n')), onInputHighlight: null }),
                isLimitExceeded && el('div', { className: 'h2l-limit-warning' }, `Görev ismi karakter limiti: ${plainTitle.length} / ${MAX_CHARS}`),

                el('div', { className: 'h2l-todoist-chips-area' },
                    el(DatePickerWrapper, { date: dueDate, time: dueTime, repeat: repeat, onChange: handleDateChange }),
                    
                    el('div', { className: 'h2l-chip-wrapper' }, 
                        el('button', { className: `h2l-todoist-chip ${assigneeIds.length > 0 ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'assignee' ? null : 'assignee') }, renderAssigneeLabel()), 
                        activePopup === 'assignee' && renderPopup()
                    ),
                    
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'priority' ? null : 'priority'), style: priority !== 4 ? { color: getPriorityColor(priority), borderColor: getPriorityColor(priority) } : {} }, el(Icon, {name:'flag'}), ` Öncelik ${priority !== 4 ? priority : ''}`), activePopup === 'priority' && renderPopup()),
                    
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip disabled' }, el(Icon, {name:'clock'}), ' Hatırlatıcılar')),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'status' ? null : 'status') }, el(Icon, {name:'spinner'}), status === 'open' ? ' Status' : ` ${status}`), activePopup === 'status' && renderPopup()),
                    
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip icon-only' }, el(Icon, {name:'ellipsis'})))
                )
            ),
            el('div', { className: 'h2l-todoist-footer' },
                el('div', { className: 'h2l-chip-wrapper' }, el('div', { className: 'h2l-todoist-project-selector', onClick: () => setActivePopup(activePopup === 'project' ? null : 'project') }, selectedProject ? el('span', {style:{color:selectedProject.color}}, '#') : el(Icon, {name:'inbox'}), el('span', null, selectedProject ? selectedProject.title : 'Proje Seç'), el(Icon, {name:'angle-down', style:{fontSize:10, marginLeft:4}})), activePopup === 'project' && renderPopup()),
                el('div', { className: 'h2l-todoist-footer-actions' }, 
                    el('button', { className: 'h2l-todoist-btn-cancel', onClick: onCancel }, 'İptal'), 
                    el('button', { className: 'h2l-todoist-btn-add', onClick: handleSubmit, disabled: !plainTitle || isLimitExceeded }, mode === 'add' ? 'Görev ekle' : 'Kaydet')
                )
            )
        );
    };

    const QuickAddTrigger = ({ onOpen }) => {
        return el('div', { className: 'h2l-todoist-add-trigger', onClick: onOpen }, el('div', { className: 'h2l-todoist-btn-content' }, el('span', { className: 'plus-icon' }, el(Icon, { name: 'plus' })), 'Görev ekle'));
    };

    window.H2L.TaskInput = { TaskEditor, QuickAddTrigger };

})(window.wp);