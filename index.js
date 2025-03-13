// src/index.js
module.exports = (api, options) => {
  api.createPages(({ createPage }) => {
    createPage({
      path: '/gridsome-plugin-all-in-one-accessibility',
      component: './node_modules/gridsome-plugin-all-in-one-accessibility/src/Admin.vue'
    })
  })
}