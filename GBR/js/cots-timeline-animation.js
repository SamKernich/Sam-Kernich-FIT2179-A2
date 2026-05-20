/**
 * cots-timeline-animation.js
 *
 * Animates the cots-timeline.json Vega-Lite chart by incrementing the
 * `max_year` signal year-by-year through the Vega view API. 
 * 
 * Created: 20/5/2024 by Sam.
 * 
 */

(function () {

  // All survey years in the dataset
  var YEARS = [
    1993,1994,1995,1996,1997,1998,1999,
    2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,
    2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,
    2020,2021,2022,2023
  ];

  var STEP_MS = 160;   // ms between each year step
  var step    = 0;
  var timer   = null;
  var vegaView = null; // holds the Vega view after embed resolves

  // Embed the spec and save the view reference
  vegaEmbed('#timeline-chart', 'Vega_Specs/cots-timeline.json', {
    actions:  false,
    renderer: 'svg'
  }).then(function (result) {
    vegaView = result.view;

    // Auto-start animation when the chart scrolls into view
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        startAnimation();
        observer.disconnect();
      }
    }, { threshold: 0.3 });

    var container = document.getElementById('timeline-chart');
    if (container) observer.observe(container);

  }).catch(function (err) {
    console.error('cots-timeline embed failed:', err);
  });


  //  Animation  //
  function startAnimation() {
    clearTimeout(timer);
    step = 0;

    if (!vegaView) return;

    // Reset chart to first year
    vegaView.signal('max_year', YEARS[0]).run();
    updateCounter(YEARS[0]);

    function tick() {
      if (step >= YEARS.length - 1) {
        updateCounter(YEARS[YEARS.length - 1]);
        return;
      }
      step++;
      vegaView.signal('max_year', YEARS[step]).run();
      updateCounter(YEARS[step]);
      timer = setTimeout(tick, STEP_MS);
    }

    timer = setTimeout(tick, STEP_MS);
  }


  //  Year counter display
  function updateCounter(year) {
    var el = document.getElementById('year-counter');
    if (el) el.textContent = year;
  }


  // Wire up the replay button
  // Uses DOMContentLoaded so the button exists before we query it
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('replay-cots-btn');
    if (btn) {
      btn.addEventListener('click', startAnimation);
    }
  });

})();
