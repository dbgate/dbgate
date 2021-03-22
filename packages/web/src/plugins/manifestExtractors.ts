import _ from 'lodash';

export function extractPluginIcon(packageManifest) {
  const { links } = packageManifest || {};
  const { repository } = links || {};
  const homepage = (links && links.homepage) || packageManifest.homepage;
  const tested = repository || homepage || packageManifest.homepage;

  if (tested) {
    const match = tested.match(/https:\/\/github.com\/([^/]*)\/([^/]*)/);
    if (match) {
      return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/master/icon.svg`;
    }
  }
  return 'unknown.svg';
}

export function extractPluginAuthor(packageManifest) {
  return _.isPlainObject(packageManifest.author) ? packageManifest.author.name : packageManifest.author;
}
