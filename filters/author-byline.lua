-- Resolve persistent slugs before Quarto normalizes title-block authors.
function Meta(meta)
  local input = quarto.doc.input_file:gsub('\\', '/')
  if not input:match('posts/') or not meta.author then return meta end
  local root = quarto.project.directory
  local file = assert(io.open(root .. '/authors.yml', 'r'))
  local yaml = file:read('*a'); file:close()
  local wrapped = 'registry:\n' .. yaml:gsub('([^\n]+)', '  %1')
  local registry = pandoc.read('---\n' .. wrapped .. '\n---\n', 'markdown').meta.registry
  local by_id = {}
  for _, author in ipairs(registry) do by_id[pandoc.utils.stringify(author.id)] = author end
  local resolved = pandoc.MetaList({})
  for _, slug_value in ipairs(meta.author) do
    local slug = pandoc.utils.stringify(slug_value)
    local record = by_id[slug]
    if not record then error(input .. ': unknown author slug "' .. slug .. '"', 0) end
    local author = {name = record.name}
    for _, key in ipairs({'url', 'orcid'}) do
      if record[key] and pandoc.utils.stringify(record[key]) ~= '' then author[key] = record[key] end
    end
    resolved:insert(pandoc.MetaMap(author))
  end
  meta.author = resolved
  meta.authors = resolved
  return meta
end
