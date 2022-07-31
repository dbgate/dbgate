export default [
  {
    ArtistId: 1,
    Name: 'AC/DC',
    Album: [
      {
        Title: 'For Those About To Rock We Salute You',
        AlbumId: 1,
        ArtistId: 1,
        Track: [
          {
            Name: 'For Those About To Rock (We Salute You)',
            AlbumId: 1,
          },
          {
            Name: 'Put The Finger On You',
            AlbumId: 1,
          },
        ],
      },
      {
        Title: 'Let There Be Rock',
        AlbumId: 4,
        ArtistId: 1,
        Track: [
          {
            Name: 'Go Down',
            AlbumId: 4,
          },
          {
            Name: 'Dog Eat Dog',
            AlbumId: 4,
          },
        ],
      },
    ],
  },
  {
    ArtistId: 2,
    Name: 'Accept',
    Album: [
      {
        Title: 'Balls to the Wall',
        AlbumId: 2,
        ArtistId: 2,
        Track: [
          {
            Name: 'Balls to the Wall',
            AlbumId: 2,
          },
        ],
      },
      {
        Title: 'Restless and Wild',
        AlbumId: 3,
        ArtistId: 2,
        Track: [
          {
            Name: 'Fast As a Shark',
            AlbumId: 3,
          },
          {
            Name: 'Restless and Wild',
            AlbumId: 3,
          },
          {
            Name: 'Princess of the Dawn',
            AlbumId: 3,
          },
        ],
      },
    ],
  },

  {
    incompleteRowsIndicator: ['Artist'],
  },
];
