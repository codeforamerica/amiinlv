var config = {
  name: 'Las Vegas',
  latitude: 36.18,
  longitude: -115.18,
  initialZoom: 13,
  finalZoom: 14,
  fileName: '/data/region.geojson',
  tagline: 'Because the city boundaries are a lot weirder than you think.',
  about: 'Las Vegas is one of the most visited cities in the world, and yet its most famous destination&mdash;a 6.8km boulevard of extravagantly themed casinos commonly known as ‘The Strip’&mdash;is actually located outside of Las Vegas city limits.  To add to the confusion, the city’s true borders are often jagged and full of small holes.  Local residents may still receive mail at a valid Las Vegas address, according to the U.S. Postal Service, even if they are under the jurisdiction of one of the surrounding unincorporated communities throughout Clark County.  As a result, the City of Las Vegas requires residents verify that they reside within city limits to receive city services.',
  responseYes: 'You are within city limits!',
  responseNo: 'You are not in Las Vegas!',
  examples: [
    '1319 Shadow Mountain Place',
    '3497 Holly Ave',
    '953 East Sahara Avenue'
  ]
}

module.exports = config
