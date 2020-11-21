import _ from 'lodash';

export function extractPluginIcon(packageManifest) {
  const { links } = packageManifest || {};
  const { repository, homepage } = links || {};
  const tested = repository || homepage || packageManifest.homepage;

  if (tested) {
    const match = tested.match(/https:\/\/github.com\/([^/]*)\/([^/]*)/);
    if (match) {
      return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/master/icon.svg`;
    }
  }
  // eslint-disable-next-line no-undef
  return `${process.env.PUBLIC_URL}/unknown.svg`;
}

export function extractPluginAuthor(packageManifest) {
  return _.isPlainObject(packageManifest.author) ? packageManifest.author.name : packageManifest.author;
}
