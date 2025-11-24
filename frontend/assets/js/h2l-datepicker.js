(function() {
    window.H2L = window.H2L || {};

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
            
            this.today = new Date();
            this.today.setHours(0,0,0,0);
            
            this.currentViewDate = new Date(this.today);
            
            this.selectedDate = options.defaultDate ? new Date(options.defaultDate) : null;
            if(this.selectedDate && isNaN(this.selectedDate.getTime())) this.selectedDate = null;

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
                <div class="td-trigger-btn">
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
            if (this.popup) this.popup.remove();
            if (this.activeMenu) this.activeMenu.remove();
        }

        toggle() { this.popup.classList.contains('active') ? this.close() : this.open(); }
        open() {
            this.popup.classList.add('active');
            this.renderCalendar();
            this.noDateShortcut.style.display = this.selectedDate ? 'flex' : 'none';
        }
        close() {
            if (this.popup) this.popup.classList.remove('active');
            this.closeMenu();
        }
        closeMenu() {
            if(this.activeMenu) {
                this.activeMenu.remove();
                this.activeMenu = null;
            }
        }

        // DÜZELTME: Fixed Positioning ve Yüksek Z-Index
        createMenu(triggerEl) {
            this.closeMenu();
            const menu = document.createElement('div');
            menu.className = 'td-floating-menu active';
            document.body.appendChild(menu);
            this.activeMenu = menu;
            
            const rect = triggerEl.getBoundingClientRect();
            
            // Scroll hesaplamalarını kaldırıp 'fixed' kullanarak viewport'a göre konumlandırıyoruz
            menu.style.position = 'fixed';
            menu.style.left = rect.left + 'px';
            menu.style.top = (rect.bottom + 5) + 'px'; // Butonun hemen altı
            
            // Modal'ın (20050) üzerinde olması için çok yüksek z-index
            menu.style.zIndex = '2147483647';
            
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

            if (!this.selectedDate || isNaN(this.selectedDate.getTime())) {
                this.label.textContent = "Tarih";
                this.iconHolder.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg>`;
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
            }
            
            if(this.popup.classList.contains('active')) this.renderCalendar();

            if (this.onChange) {
                let isoDate = null;
                if (this.selectedDate && !isNaN(this.selectedDate.getTime())) {
                    const y = this.selectedDate.getFullYear();
                    const m = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
                    const d = String(this.selectedDate.getDate()).padStart(2, '0');
                    isoDate = `${y}-${m}-${d}`;
                    if (this.selectedTime) isoDate += ` ${this.selectedTime}:00`;
                }
                this.onChange({ date: isoDate, time: this.selectedTime, repeat: this.selectedRepeat });
            }
        }

        getSmartDateLabel(date) {
            if (!date || isNaN(date.getTime())) return { text: "Tarih", class: "", icon: "" };
            const tomorrow = this.addDays(this.today, 1);
            const diffTime = date - this.today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            if (this.isSameDay(date, this.today)) return { text: "Bugün", class: "is-today", icon: this.getDynamicCalendarIcon(date.getDate()) };
            if (this.isSameDay(date, tomorrow)) return { text: "Yarın", class: "is-tomorrow", icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-13h-2v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>` };
            if (diffDays > 0 && diffDays < 7) return { text: this.daysLong[date.getDay()], class: "is-next-week", icon: this.getDynamicCalendarIcon(date.getDate()) };
            return { text: `${date.getDate()} ${this.months[date.getMonth()].substring(0,3)}`, class: "is-date", icon: this.getDynamicCalendarIcon(date.getDate()) };
        }

        getDynamicCalendarIcon(dayNum) {
            if (isNaN(dayNum)) dayNum = 1;
            return `<svg viewBox="0 0 24 24" class="dynamic-calendar-icon" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/><text x="12" y="19" text-anchor="middle" fill="${this.isSameDay(this.selectedDate, this.today) || !this.selectedDate ? 'currentColor' : '#fff'}" style="font-size:10px; font-family:sans-serif; font-weight:700;">${dayNum}</text></svg>`;
        }

        addDays(d, n) { const z=new Date(d); z.setDate(z.getDate()+n); return z; }
        getNextDay(dayIdx) { const d=new Date(); d.setDate(d.getDate() + (dayIdx + 7 - d.getDay()) % 7); if(d<=new Date()) d.setDate(d.getDate()+7); return d; }
        isSameDay(a, b) { return a && b && !isNaN(a.getTime()) && !isNaN(b.getTime()) && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
        getDayNameShort(d) { return this.daysShort[(d.getDay()+6)%7]; }
        formatDateShort(d) { if (!d || isNaN(d.getTime())) return ''; return `${d.getDate()} ${this.months[d.getMonth()].substring(0,3)}`; }
        getMonday(d) { d = new Date(d); var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1); return new Date(d.setDate(diff)); }
    }

    window.H2L.TodoistDatepicker = TodoistDatepicker;
})();