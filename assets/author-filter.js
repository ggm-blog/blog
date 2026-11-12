// Names are already rendered by Quarto. This script only filters listing items.
document.addEventListener("DOMContentLoaded", () => {
  const author = document.getElementById("listing-author");
  const category = document.getElementById("listing-category");
  if (!author || !category) return;
  const apply = () => {
    const list = window["quarto-listings"]?.["listing-posts"];
    if (!list) return;
    list.filter((item) => {
      const slugs = JSON.parse(item.elm.dataset.authorSlugs);
      const categories = JSON.parse(item.elm.dataset.postCategories);
      return (!author.value || slugs.includes(author.value)) &&
        (!category.value || categories.includes(category.value));
    });
  };
  author.addEventListener("change", apply);
  category.addEventListener("change", apply);
});
