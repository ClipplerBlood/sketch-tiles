export async function preloadTemplates() {
  const templatePaths = [
    // Add paths to "modules/sketch-tiles/templates"
    'modules/sketch-tiles/templates/sketch-app.html',
  ];

  return loadTemplates(templatePaths);
}
