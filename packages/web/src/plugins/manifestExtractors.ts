import _ from 'lodash';

export function extractPluginIcon(packageManifest) {
  const { links } = packageManifest || {};
  const { repository } = links || {};
  const homepage = (links && links.homepage) || packageManifest.homepage;
  const tested = repository || homepage || packageManifest.homepage;

  if (packageManifest.description) {
    const iconLink = packageManifest.description.match(/\!\[icon\]\(([^)]+)\)/, '');
    if (iconLink) {
      return iconLink[1];
    }
  }

  if (tested == 'https://dbgate.org' || tested == 'https://github.com/dbgate/dbgate') {
    // monorepo plugin
    return `https://github.com/dbgate/dbgate/raw/master/plugins/${packageManifest.name}/icon.svg`;
  }

  // if (tested) {
  //   const match = tested.match(/https:\/\/github.com\/([^/]*)\/([^/]*)/);
  //   if (match) {
  //     return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/master/icon.svg`;
  //   }
  // }
  return 'unknown.svg';
}

export function extractPluginAuthor(packageManifest) {
  if (_.isPlainObject(packageManifest.author) && packageManifest.author.name) {
    return packageManifest.author.name;
  }
  if (packageManifest.author) {
    return packageManifest.author;
  }
  if (_.isPlainObject(packageManifest.publisher) && packageManifest.publisher.username) {
    return packageManifest.publisher.username;
  }
  if (
    packageManifest.maintainers &&
    _.isPlainObject(packageManifest.maintainers[0]) &&
    packageManifest.maintainers[0].username
  ) {
    return packageManifest.maintainers[0].username;
  }
  return '(Unknown author)';
}

export function extractPluginDescription(packageManifest) {
  if (!packageManifest.description || packageManifest.description?.indexOf('[![') >= 0) {
    return '(No description)';
  }

  return packageManifest.description.replace(/\!\[icon\]\([^)]+\)/, '').trim();
}
