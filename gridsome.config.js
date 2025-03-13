  export default function (Vue, { head }) {
    // Add an external JavaScript before the closing </body> tag
    head.script.push({
      src: 'https://www.skynettechnologies.com/accessibility/js/all-in-one-accessibility-js-widget-minify.js?colorcode=#420083&token=&position=bottom_right',
      body: true
    })
  
  }
  