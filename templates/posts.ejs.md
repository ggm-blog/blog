<%
const authors = new Map();
const categories = new Set();
for (const item of items) {
  for (const author of item['author-records'] || []) authors.set(author.id, author.name);
  for (const category of item.categories || []) categories.add(category);
}
%>
```{=html}
<div class="listing-selectors d-flex flex-wrap gap-3 mb-3">
  <div>
    <label for="listing-author" class="form-label">Author</label>
    <select id="listing-author" class="form-select">
      <option value="">All authors</option>
      <% for (const [slug, name] of [...authors].sort((a, b) => a[1].localeCompare(b[1]))) { %>
      <option value="<%- slug %>"><%- name %></option>
      <% } %>
    </select>
  </div>
  <div>
    <label for="listing-category" class="form-label">Category</label>
    <select id="listing-category" class="form-select">
      <option value="">All categories</option>
      <% for (const category of [...categories].sort()) { %>
      <option value="<%- category %>"><%- category %></option>
      <% } %>
    </select>
  </div>
</div>
<div class="list quarto-listing-default">
<% for (const item of items) { %>
  <article class="quarto-post image-right" <%= metadataAttrs(item) %>
      data-author-slugs="<%- JSON.stringify(item['author-slugs']) %>"
      data-post-categories="<%- JSON.stringify(item.categories || []) %>">
    <div class="body">
      <h3 class="no-anchor listing-title"><a href="<%- item.path %>"><%= item.title %></a></h3>
      <% if (item.categories && item.categories.length) { %>
      <div class="listing-categories">
        <% for (const category of item.categories) { %>
        <span class="listing-category"><%- category %></span>
        <% } %>
      </div>
      <% } %>
      <% if (item.description) { %><div class="listing-description"><%= item.description %></div><% } %>
    </div>
    <div class="metadata">
      <% if (item.date) { %><div class="listing-date"><%= item.date %></div><% } %>
      <div class="listing-author"><%= item.author %></div>
    </div>
    <% if (item.image) { %>
    <div class="thumbnail"><a href="<%- item.path %>"><img src="<%- item.image %>" alt="<%- item['image-alt'] || '' %>" loading="lazy"></a></div>
    <% } %>
  </article>
<% } %>
</div>
```
