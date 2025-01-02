jQuery(document).ready(function($){
    var timelines = $('.cd-horizontal-timeline'),
        eventsMinDistance = 60;

    (timelines.length > 0) && initTimeline(timelines);

    function initTimeline(timelines) {
        timelines.each(function(){
            var timeline = $(this),
                timelineComponents = {};
            //cache timeline components
            timelineComponents['timelineWrapper'] = timeline.find('.events-wrapper');
            timelineComponents['eventsWrapper'] = timelineComponents['timelineWrapper'].children('.events');
            timelineComponents['fillingLine'] = timelineComponents['eventsWrapper'].children('.filling-line');
            timelineComponents['timelineEvents'] = timelineComponents['eventsWrapper'].find('a');
            timelineComponents['timelineDates'] = parseDate(timelineComponents['timelineEvents']);
            timelineComponents['eventsMinLapse'] = minLapse(timelineComponents['timelineDates']);
            timelineComponents['timelineNavigation'] = timeline.find('.cd-timeline-navigation');
            timelineComponents['eventsContent'] = timeline.children('.events-content');

            //assign a left postion to the single events along the timeline
            setDatePosition(timelineComponents, eventsMinDistance);
            //assign a width to the timeline
            var timelineTotWidth = setTimelineWidth(timelineComponents, eventsMinDistance);
            //the timeline has been initialize - show it
            timeline.addClass('loaded');

            //detect click on the next arrow
            timelineComponents['timelineNavigation'].on('click', '.next', function(event){
                event.preventDefault();
                updateSlide(timelineComponents, timelineTotWidth, 'next');
            });
            //detect click on the prev arrow
            timelineComponents['timelineNavigation'].on('click', '.prev', function(event){
                event.preventDefault();
                updateSlide(timelineComponents, timelineTotWidth, 'prev');
            });
            //detect click on the a single event - show new event content
            timelineComponents['eventsWrapper'].on('click', 'a', function(event){
                event.preventDefault();
                timelineComponents['timelineEvents'].removeClass('selected');
                $(this).addClass('selected');
                updateOlderEvents($(this));
                updateFilling($(this), timelineComponents['fillingLine'], timelineTotWidth);
                updateVisibleContent($(this), timelineComponents['eventsContent']);
            });

            //on swipe, show next/prev event content
            timelineComponents['eventsContent'].on('swipeleft', function(){
                var mq = checkMQ();
                ( mq == 'mobile' ) && showNewContent(timelineComponents, timelineTotWidth, 'next');
            });
            timelineComponents['eventsContent'].on('swiperight', function(){
                var mq = checkMQ();
                ( mq == 'mobile' ) && showNewContent(timelineComponents, timelineTotWidth, 'prev');
            });

            //keyboard navigation
            $(document).keyup(function(event){
                if(event.which=='37' && elementInViewport(timeline.get(0)) ) {
                    showNewContent(timelineComponents, timelineTotWidth, 'prev');
                } else if( event.which=='39' && elementInViewport(timeline.get(0))) {
                    showNewContent(timelineComponents, timelineTotWidth, 'next');
                }
            });
        });
    }

    function updateSlide(timelineComponents, timelineTotWidth, string) {
        //retrieve translateX value of timelineComponents['eventsWrapper']
        var translateValue = getTranslateValue(timelineComponents['eventsWrapper']),
            wrapperWidth = Number(timelineComponents['timelineWrapper'].css('width').replace('px', ''));
        //translate the timeline to the left('next')/right('prev')
        (string == 'next')
            ? translateTimeline(timelineComponents, translateValue - wrapperWidth + eventsMinDistance, wrapperWidth - timelineTotWidth)
            : translateTimeline(timelineComponents, translateValue + wrapperWidth - eventsMinDistance);
    }

    function showNewContent(timelineComponents, timelineTotWidth, string) {
        //go from one event to the next/previous one
        var visibleContent =  timelineComponents['eventsContent'].find('.selected'),
            newContent = ( string == 'next' ) ? visibleContent.next() : visibleContent.prev();

        if ( newContent.length > 0 ) { //if there's a next/prev event - show it
            var selectedDate = timelineComponents['eventsWrapper'].find('.selected'),
                newEvent = ( string == 'next' ) ? selectedDate.parent('li').next('li').children('a') : selectedDate.parent('li').prev('li').children('a');

            updateFilling(newEvent, timelineComponents['fillingLine'], timelineTotWidth);
            updateVisibleContent(newEvent, timelineComponents['eventsContent']);
            newEvent.addClass('selected close-card');
            selectedDate.removeClass('selected');
            updateOlderEvents(newEvent);
            updateTimelinePosition(string, newEvent, timelineComponents);
        }
    }

    function updateTimelinePosition(string, event, timelineComponents) {
        //translate timeline to the left/right according to the position of the selected event
        var eventStyle = window.getComputedStyle(event.get(0), null),
            eventLeft = Number(eventStyle.getPropertyValue("left").replace('px', '')),
            timelineWidth = Number(timelineComponents['timelineWrapper'].css('width').replace('px', '')),
            timelineTotWidth = Number(timelineComponents['eventsWrapper'].css('width').replace('px', ''));
        var timelineTranslate = getTranslateValue(timelineComponents['eventsWrapper']);

        if( (string == 'next' && eventLeft > timelineWidth - timelineTranslate) || (string == 'prev' && eventLeft < - timelineTranslate) ) {
            translateTimeline(timelineComponents, - eventLeft + timelineWidth/2, timelineWidth - timelineTotWidth);
        }
    }

    function translateTimeline(timelineComponents, value, totWidth) {
        var eventsWrapper = timelineComponents['eventsWrapper'].get(0);
        value = (value > 0) ? 0 : value; //only negative translate value
        value = ( !(typeof totWidth === 'undefined') &&  value < totWidth ) ? totWidth : value; //do not translate more than timeline width
        setTransformValue(eventsWrapper, 'translateX', value+'px');
        //update navigation arrows visibility
        (value == 0 ) ? timelineComponents['timelineNavigation'].find('.prev').addClass('inactive') : timelineComponents['timelineNavigation'].find('.prev').removeClass('inactive');
        (value == totWidth ) ? timelineComponents['timelineNavigation'].find('.next').addClass('inactive') : timelineComponents['timelineNavigation'].find('.next').removeClass('inactive');
    }

    function updateFilling(selectedEvent, filling, totWidth) {
        //change .filling-line length according to the selected event
        var eventStyle = window.getComputedStyle(selectedEvent.get(0), null),
            eventLeft = eventStyle.getPropertyValue("left"),
            eventWidth = eventStyle.getPropertyValue("width");
        eventLeft = Number(eventLeft.replace('px', '')) + Number(eventWidth.replace('px', ''))/2;
        var scaleValue = eventLeft/totWidth;
        setTransformValue(filling.get(0), 'scaleX', scaleValue);
    }

    function setDatePosition(timelineComponents, min) {
        for (i = 0; i < timelineComponents['timelineDates'].length; i++) {
            var distance = daydiff(timelineComponents['timelineDates'][0], timelineComponents['timelineDates'][i]),
                distanceNorm = Math.round(distance/timelineComponents['eventsMinLapse']) + 2;
            timelineComponents['timelineEvents'].eq(i).css('left', distanceNorm*min+'px');
        }
    }

    function setTimelineWidth(timelineComponents, width) {
        var timeSpan = daydiff(timelineComponents['timelineDates'][0], timelineComponents['timelineDates'][timelineComponents['timelineDates'].length-1]),
            timeSpanNorm = timeSpan/timelineComponents['eventsMinLapse'],
            timeSpanNorm = Math.round(timeSpanNorm) + 4,
            totalWidth = timeSpanNorm*width;
        timelineComponents['eventsWrapper'].css('width', totalWidth+'px');
        updateFilling(timelineComponents['eventsWrapper'].find('a.selected'), timelineComponents['fillingLine'], totalWidth);
        updateTimelinePosition('next', timelineComponents['eventsWrapper'].find('a.selected'), timelineComponents);

        return totalWidth;
    }

    function updateVisibleContent(event, eventsContent) {
        var eventDate = event.data('date'),
            visibleContent = eventsContent.find('.selected'),
            selectedContent = eventsContent.find('[data-date="'+ eventDate +'"]'),
            selectedContentHeight = selectedContent.height();

        if (selectedContent.index() > visibleContent.index()) {
            var classEntering = 'selected enter-right',
                classLeaving = 'leave-left';
        } else {
            var classEntering = 'selected enter-left',
                classLeaving = 'leave-right';
        }

        selectedContent.attr('class', classEntering);
        visibleContent.attr('class', classLeaving).one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(){
            visibleContent.removeClass('leave-right leave-left');
            selectedContent.removeClass('enter-left enter-right');
        });
        eventsContent.css('height', selectedContentHeight+'px');
    }

    function updateOlderEvents(event) {
        event.parent('li').prevAll('li').children('a').addClass('older-event').end().end().nextAll('li').children('a').removeClass('older-event');
    }

    function getTranslateValue(timeline) {
        var timelineStyle = window.getComputedStyle(timeline.get(0), null),
            timelineTranslate = timelineStyle.getPropertyValue("-webkit-transform") ||
                timelineStyle.getPropertyValue("-moz-transform") ||
                timelineStyle.getPropertyValue("-ms-transform") ||
                timelineStyle.getPropertyValue("-o-transform") ||
                timelineStyle.getPropertyValue("transform");

        if( timelineTranslate.indexOf('(') >=0 ) {
            var timelineTranslate = timelineTranslate.split('(')[1];
            timelineTranslate = timelineTranslate.split(')')[0];
            timelineTranslate = timelineTranslate.split(',');
            var translateValue = timelineTranslate[4];
        } else {
            var translateValue = 0;
        }

        return Number(translateValue);
    }

    function setTransformValue(element, property, value) {
        element.style["-webkit-transform"] = property+"("+value+")";
        element.style["-moz-transform"] = property+"("+value+")";
        element.style["-ms-transform"] = property+"("+value+")";
        element.style["-o-transform"] = property+"("+value+")";
        element.style["transform"] = property+"("+value+")";
    }

    //based on http://stackoverflow.com/questions/542938/how-do-i-get-the-number-of-days-between-two-dates-in-javascript
    function parseDate(events) {
        var dateArrays = [];
        events.each(function(){
            var singleDate = $(this),
                dateComp = singleDate.data('date').split('T');
            if( dateComp.length > 1 ) { //both DD/MM/YEAR and time are provided
                var dayComp = dateComp[0].split('/'),
                    timeComp = dateComp[1].split(':');
            } else if( dateComp[0].indexOf(':') >=0 ) { //only time is provide
                var dayComp = ["2000", "0", "0"],
                    timeComp = dateComp[0].split(':');
            } else { //only DD/MM/YEAR
                var dayComp = dateComp[0].split('/'),
                    timeComp = ["0", "0"];
            }
            var	newDate = new Date(dayComp[2], dayComp[1]-1, dayComp[0], timeComp[0], timeComp[1]);
            dateArrays.push(newDate);
        });
        return dateArrays;
    }

    function daydiff(first, second) {
        return Math.round((second-first));
    }

    function minLapse(dates) {
        //determine the minimum distance among events
        var dateDistances = [];
        for (i = 1; i < dates.length; i++) {
            var distance = Math.round(daydiff(dates[i-1], dates[i])/4);
            dateDistances.push(distance);
        }
        return Math.min.apply(null, dateDistances);
    }

    /*
        How to tell if a DOM element is visible in the current viewport?
        http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport
    */
    function elementInViewport(el) {
        var top = el.offsetTop;
        var left = el.offsetLeft;
        var width = el.offsetWidth;
        var height = el.offsetHeight;

        while(el.offsetParent) {
            el = el.offsetParent;
            top += el.offsetTop;
            left += el.offsetLeft;
        }

        return (
            top < (window.pageYOffset + window.innerHeight) &&
            left < (window.pageXOffset + window.innerWidth) &&
            (top + height) > window.pageYOffset &&
            (left + width) > window.pageXOffset
        );
    }

    function checkMQ() {
        //check if mobile or desktop device
        return window.getComputedStyle(document.querySelector('.cd-horizontal-timeline'), '::before').getPropertyValue('content').replace(/'/g, "").replace(/"/g, "");
    }

});

// Esegui il codice quando il DOM è completamente caricato
document.addEventListener("DOMContentLoaded", function() {
    // Seleziona il contenitore degli eventi e tutti i link al suo interno
    const eventsWrapper = document.querySelector('.events-wrapper');
    const links = document.querySelectorAll('.events ul li a');

    // Aggiungi un evento di click a ciascun link
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // Previeni il comportamento predefinito del link (navigazione)

            // Ottieni la posizione orizzontale del link rispetto alla finestra (viewport)
            const linkPosition = link.getBoundingClientRect().left;
            // Ottieni le dimensioni e la posizione del contenitore visibile (eventsWrapper)
            const wrapperRect = eventsWrapper.getBoundingClientRect();
            const wrapperWidth = wrapperRect.width; // Larghezza visibile del wrapper

            let targetScrollLeft; // Variabile per la posizione di scroll desiderata

            // Controlla se il link si trova nella parte destra dello schermo (oltre i 3/4 della larghezza del wrapper)
            if (linkPosition > wrapperRect.left + (wrapperWidth * 3/4)) {
                // Se sì, calcola la nuova posizione di scroll per andare a destra
                targetScrollLeft = eventsWrapper.scrollLeft + wrapperWidth / 2;
            }
            // Controlla se il link si trova nella parte sinistra dello schermo (prima di 1/4 della larghezza del wrapper)
            else if (linkPosition < wrapperRect.left + (wrapperWidth * 1/4)) {
                // Se sì, calcola la nuova posizione di scroll per andare a sinistra
                targetScrollLeft = eventsWrapper.scrollLeft - wrapperWidth / 2;
            }

            // Se è stata calcolata una nuova posizione di scroll (targetScrollLeft), esegui lo scroll animato
            if (targetScrollLeft !== undefined) {
                smoothScroll(eventsWrapper, targetScrollLeft, 600); // Esegui uno scroll in 600ms
            }
        });
    });

    // Funzione per eseguire uno scroll animato
    function smoothScroll(element, target, duration) {
        const start = element.scrollLeft; // Posizione iniziale dello scroll
        const change = target - start; // Differenza tra la posizione di partenza e quella di arrivo
        const startTime = performance.now(); // Tempo di inizio dell'animazione

        // Funzione per animare lo scroll
        function animateScroll(currentTime) {
            const timeElapsed = currentTime - startTime; // Tempo trascorso dall'inizio dell'animazione
            const progress = Math.min(timeElapsed / duration, 1); // Progresso dell'animazione (0 a 1)

            // Calcola la nuova posizione dello scroll usando una funzione di easing (per un'animazione più fluida)
            element.scrollLeft = start + change * easeInOutQuad(progress);

            // Continua l'animazione finché il tempo trascorso è inferiore alla durata
            if (timeElapsed < duration) {
                requestAnimationFrame(animateScroll); // Richiedi il prossimo frame di animazione
            }
        }

        // Funzione di easing per rendere l'animazione più naturale (inizio e fine più morbidi)
        function easeInOutQuad(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }

        // Avvia l'animazione
        requestAnimationFrame(animateScroll);
    }
});

jQuery(document).ready(function($) {
    // Funzione per verificare se è un dispositivo mobile
    function isMobile() {
        return window.innerWidth <= 480;
    }

    // Se è mobile, avvia la logica per la select
    if (isMobile()) {
        initMobileTimeline();

        // Trova l'anno più recente nella select
        var latestYearOption = getLatestYear();
        if (latestYearOption) {
            updateMobileContent(latestYearOption);
        }
    }

    // Inizializza la logica della select per la timeline mobile
    function initMobileTimeline() {
        $('#select_year_timeline_mobile').on('change', function() {
            var selectedYear = $(this).find(':selected').data('date');
            if (selectedYear) {
                updateMobileContent(selectedYear);
            }
        });
    }

    // Trova l'anno più recente
    function getLatestYear() {
        var options = $('#select_year_timeline_mobile option[data-date]');
        var latestDate = null;

        options.each(function() {
            var dateValue = $(this).data('date');
            var currentDate = new Date(dateValue);

            if (!latestDate || currentDate > latestDate) {
                latestDate = dateValue;
            }
        });

        return latestDate;
    }

    // Aggiorna il contenuto per la versione mobile
    function updateMobileContent(selectedDate) {
        var eventsContent = $('.events-content'),
            visibleContent = eventsContent.find('.selected'),
            selectedContent = eventsContent.find(`[data-date="${selectedDate}"]`);

        if (selectedContent.length) {
            var selectedContentHeight = selectedContent.height();

            // Nascondi il contenuto corrente e mostra il nuovo contenuto selezionato
            visibleContent.removeClass('selected');
            selectedContent.addClass('selected');

            // Aggiorna l'altezza del contenitore per evitare salti
            eventsContent.css('height', selectedContentHeight + 'px');
        }
    }
});




