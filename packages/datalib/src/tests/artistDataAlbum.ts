export default [
  {
    ArtistId: 1,
    Name: 'AC/DC',
    Album: [
      {
        Title: 'For Those About To Rock We Salute You',
        ArtistId: 1,
      },
      {
        Title: 'Let There Be Rock',
        ArtistId: 1,
      },
    ],
  },
  {
    ArtistId: 2,
    Name: 'Accept',
    Album: [
      {
        Title: 'Balls to the Wall',
        ArtistId: 2,
      },
      {
        Title: 'Restless and Wild',
        ArtistId: 2,
      },
    ],
  },
  {
    ArtistId: 3,
    Name: 'Aerosmith',
    Album: [
      {
        Title: 'Big Ones',
        ArtistId: 3,
      },
    ],
  },
  {
    ArtistId: 4,
    Name: 'Alanis Morissette',
    Album: [
      {
        Title: 'Jagged Little Pill',
        ArtistId: 4,
      },
      {
        incompleteRowsIndicator: ['Artist.Album'],
      },
    ],
  },
  {
    incompleteRowsIndicator: ['Artist'],
  },
];
