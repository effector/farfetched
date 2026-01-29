export function groupByVersions(packages) {
  const groupedByVersions = [];

  for (const { name, changes } of packages) {
    for (const [version, versionChanges] of Object.entries(changes)) {
      const versionGroup = groupedByVersions.find(
        (group) => group.version === version
      );

      if (versionGroup) {
        versionGroup.packages.push({ name, changes: versionChanges });
      } else {
        groupedByVersions.push({
          version,
          packages: [{ name, changes: versionChanges }],
        });
      }
    }
  }

  return groupedByVersions;
}

export function excludeTrashUpdates(items) {
  return items
    .map((tags) => {
      const [header, ...body] = tags;

      const filteredBody = body.filter((item) => {
        const updateItem = item.at(1);
        if (typeof updateItem !== 'string') {
          return true;
        }

        const isTrashUpdate = updateItem
          .toLowerCase()
          .includes('updated dependencies');

        return !isTrashUpdate;
      });

      if (filteredBody.length === 0) {
        return null;
      }

      return [header, ...filteredBody];
    })
    .filter(Boolean);
}
