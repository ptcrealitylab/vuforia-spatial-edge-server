createNameSpace('realityEditor.videoPlayback');

(function (exports) {
    class Calendar {
        constructor(parent, initiallyVisible) {
            this.dateNow = new Date(Date.now());
            this.selectedDate = {
                month: this.dateNow.getMonth(),
                year: this.dateNow.getFullYear(),
                day: this.dateNow.getDate() // use getDate. getDay returns index of weekday, e.g. Tues = 2
            };
            this.dateWhenSelected = {
                month: null,
                year: null,
                day: null
            };
            this.highlightedDates = [];
            this.padding = 10;
            this.weekDayNames = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
            this.monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            this.selectedDateDiv = null;
            this.callbacks = {
                onDateSelected: []
            };
            // do this after initializing state
            this.buildDom();
            if (!initiallyVisible) {
                this.hide();
            }
            parent.appendChild(this.dom);

            this.updateDomForMonth(this.selectedDate.month, this.selectedDate.year);
        }
        buildDom() {
            this.dom = document.createElement('div');
            this.dom.classList.add('calendar');
            this.dom.style.padding = this.padding + 'px';

            let header = document.createElement('div');
            header.id = 'calHeader';
            header.style.top = this.padding + 'px';
            let prevMonth = document.createElement('div');
            prevMonth.id = 'calPrevMonth';
            prevMonth.style.left = this.padding + 'px';
            prevMonth.innerText = '<';
            let nextMonth = document.createElement('div');
            nextMonth.id = 'calNextMonth';
            nextMonth.style.right = this.padding + 'px';
            nextMonth.innerText = '>';
            let monthName = document.createElement('div');
            monthName.id = 'calMonthName';
            monthName.innerText = 'March 2022';
            header.appendChild(prevMonth);
            header.appendChild(monthName);
            header.appendChild(nextMonth);
            this.dom.appendChild(header);

            let labels = document.createElement('div');
            labels.id = 'calLabels';
            labels.style.top = 30 + this.padding + 'px';
            for (let i = 0; i < 7; i++) {
                let label = document.createElement('div');
                let x = (300 / 7) * i + this.padding;
                label.style.width = (300 / 7) + 'px';
                label.style.left = JSON.stringify(x) + 'px';
                label.innerText = this.weekDayNames[i];
                labels.appendChild(label);
            }
            this.dom.appendChild(labels);

            let dates = document.createElement('div');
            dates.id = 'calDates';
            dates.style.top = 60 + this.padding + 'px';
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 7; c++) {
                    let date = document.createElement('div');
                    date.classList.add('calDate');
                    let dayNumber = 1 + r * 7 + c;
                    // let weekDayName = this.weekDayNames[c];

                    let x = (300 / 7) * c + this.padding;
                    let y = (240 / 6) * r;
                    date.style.width = (300 / 7) + 'px';
                    date.style.left = JSON.stringify(x) + 'px';
                    date.style.height = (240 / 6) + 'px';
                    date.style.lineHeight = (240 / 6) + 'px';
                    date.style.borderRadius = (300 / 7) * 0.5 + 'px';
                    date.style.top = JSON.stringify(y) + 'px';

                    date.setAttribute('dayNumber', JSON.stringify(dayNumber));
                    // date.setAttribute('weekDayName', weekDayName);
                    dates.appendChild(date);

                    date.addEventListener('pointerup', _ => {
                        this.selectDate(date);
                    });
                }
            }
            this.dom.appendChild(dates);

            prevMonth.addEventListener('pointerup', _ => {
                this.scrollMonth(-1);
            });
            nextMonth.addEventListener('pointerup', _ => {
                this.scrollMonth(1);
            });
            monthName.addEventListener('pointerup', _ => {
                this.scrollToToday();
            });
        }
        updateDomForMonth(monthIndex, year) {
            let date = new Date(year, monthIndex);
            console.debug('new date = ' + date.toString());
            let monthName = this.monthNames[monthIndex];
            document.getElementById('calMonthName').innerText = monthName + ' ' + year;
            let calDates = document.getElementById('calDates');
            let numDays = this.daysInMonth(monthIndex, year);
            console.debug(monthName + ' has ' + numDays + ' days');
            console.debug(date.getDate() + ' is a ' + this.weekDayNames[date.getDay()]);
            let dayOneIndex = date.getDay();
            let searching = true;
            let isNextMonth = false;
            let i = 0;
            let currentDayNumber = 1;
            let firstDayOffset = 0;
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 7; c++) {
                    if (searching) {
                        if (c === dayOneIndex) {
                            calDates.children[i].innerText = currentDayNumber;
                            calDates.children[i].setAttribute('dayNumber', JSON.stringify(currentDayNumber));
                            currentDayNumber += 1;
                            searching = false;
                            firstDayOffset = i;
                        } else {
                            calDates.children[i].innerText = '_';
                        }
                    } else if (currentDayNumber <= numDays) {
                        calDates.children[i].innerText = currentDayNumber;
                        calDates.children[i].setAttribute('dayNumber', JSON.stringify(currentDayNumber));
                        currentDayNumber += 1;
                    } else {
                        calDates.children[i].innerText = '';
                    }
                    if (isNextMonth) {
                        calDates.children[i].classList.add('otherMonthDate');
                    } else {
                        calDates.children[i].classList.remove('otherMonthDate');
                    }
                    if (currentDayNumber > numDays) {
                        currentDayNumber = 1;
                        isNextMonth = true;
                    }
                    i++;
                }
            }

            // back-fill dates from previous month
            if (firstDayOffset > 0) {
                Array.from(calDates.children).forEach((elt, i) => {
                    if (elt.innerText !== '_') { return; }
                    let relativeIndex = i - firstDayOffset;
                    elt.innerText = new Date(year, monthIndex, relativeIndex + 1).getDate();
                    calDates.children[i].setAttribute('dayNumber', elt.innerText);
                    elt.classList.add('otherMonthDate');
                });
            }

            // reset highlights, and re-select a date if you scrolled the month since it was selected
            if (this.selectedDate.month === this.dateWhenSelected.month &&
                this.selectedDate.year === this.dateWhenSelected.year) {
                Array.from(calDates.children).forEach((elt) => {
                    let dayNumber = parseInt(elt.getAttribute('dayNumber'));
                    if (dayNumber === this.dateWhenSelected.day) {
                        this.selectDate(elt);
                    }
                });
            }

            // reset highlights
            Array.from(calDates.children).forEach((elt) => {
                elt.classList.remove('highlightedDate');
            });
            this.highlightDates(this.highlightedDates);
        }
        selectDate(elt) {
            if (!elt) { return; }
            if (elt.classList.contains('otherMonthDate')) {
                let dayNumber = parseInt(elt.getAttribute('dayNumber'));
                if (dayNumber > 14) {
                    this.scrollMonth(-1);
                } else {
                    this.scrollMonth(1);
                }
                this.selectDate(this.getDateElementForDay(dayNumber));
                return;
            }

            this.selectedDate.day = parseInt(elt.getAttribute('dayNumber'));
            console.debug('selected day: ' + this.selectedDate.day);

            this.dateWhenSelected.day = this.selectedDate.day;
            this.dateWhenSelected.month = this.selectedDate.month;
            this.dateWhenSelected.year = this.selectedDate.year;

            this.unselectPreviousDate();
            this.selectedDateDiv = elt;
            this.selectedDateDiv.classList.add('selectedDate');

            this.callbacks.onDateSelected.forEach(callback => {
                callback(new Date(this.selectedDate.year, this.selectedDate.month, this.selectedDate.day));
            });
        }
        unselectPreviousDate() {
            if (this.selectedDateDiv) {
                this.selectedDateDiv.classList.remove('selectedDate');
                this.selectedDateDiv = null;
            }
        }
        getDateElementForDay(number) {
            let match = null;
            Array.from(document.getElementById('calDates').children).forEach(elt => {
                if (parseInt(elt.getAttribute('dayNumber')) === number &&
                    !elt.classList.contains('otherMonthDate')) {
                    match = elt;
                }
            });
            return match;
        }
        getDateElement(dateObject) {
            let year = dateObject.getFullYear();
            let month = dateObject.getMonth();
            let day = dateObject.getDate();
            if (this.selectedDate.year !== year) { return null; }
            if (this.selectedDate.month !== month) { return null; }
            return this.getDateElementForDay(day);
        }
        scrollMonth(increment) {
            this.selectedDate.month += increment;
            if (this.selectedDate.month < 0) {
                this.selectedDate.year -= 1;
                this.selectedDate.month += 12;
            } else if (this.selectedDate.month >= 12) {
                this.selectedDate.year += 1;
                this.selectedDate.month -= 12;
            }
            this.unselectPreviousDate();
            this.updateDomForMonth(this.selectedDate.month, this.selectedDate.year);
        }
        scrollToToday() {
            this.unselectPreviousDate();
            this.selectedDate = {
                month: this.dateNow.getMonth(),
                year: this.dateNow.getFullYear(),
                day: this.dateNow.getDate() // use getDate. getDay returns index of weekday, e.g. Tues = 2
            };
            this.updateDomForMonth(this.selectedDate.month, this.selectedDate.year);
        }
        // https://stackoverflow.com/a/1184359
        // Month in JavaScript is 0-indexed (January is 0, February is 1, etc),
        // but by using 0 as the day it will give us the last day of the prior
        // month. So passing in 1 as the month number will return the last day
        daysInMonth(month, year) {
            return new Date(year, month + 1, 0).getDate();
        }
        selectToday() {
            this.scrollToToday();
            this.selectDate(this.getDateElementForDay(this.selectedDate.day));
        }
        selectDay(timestamp) {
            this.unselectPreviousDate();
            let thisDate = new Date(timestamp);
            this.selectedDate = {
                month: thisDate.getMonth(),
                year: thisDate.getFullYear(),
                day: thisDate.getDate() // use getDate. getDay returns index of weekday, e.g. Tues = 2
            };
            this.updateDomForMonth(this.selectedDate.month, this.selectedDate.year);
            this.selectDate(this.getDateElementForDay(this.selectedDate.day));
        }
        onDateSelected(callback) {
            this.callbacks.onDateSelected.push(callback);
        }
        highlightDates(datesList) {
            this.highlightedDates = datesList;
            datesList.forEach(dateObject => {
                this.highlightDate(this.getDateElement(dateObject));
            });
        }
        highlightDate(dateElement) {
            if (!dateElement) { return; }
            dateElement.classList.add('highlightedDate');
        }
        show() {
            this.dom.classList.add('timelineCalendarVisible');
            this.dom.classList.remove('timelineCalendarHidden');
        }
        hide() {
            this.dom.classList.remove('timelineCalendarVisible');
            this.dom.classList.add('timelineCalendarHidden');
        }
    }
    exports.Calendar = Calendar;
})(realityEditor.videoPlayback);
