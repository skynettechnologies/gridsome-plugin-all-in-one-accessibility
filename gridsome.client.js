export default function (Vue, options, { head, isServer: disabled, router }) {
    if (process.isClient) {
      head.script.push({
        src: 'https://www.skynettechnologies.com/accessibility/js/all-in-one-accessibility-js-widget-minify.js?colorcode=&token=&position=',
        body: true,
      });
    }
  }
  