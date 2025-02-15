
/*******************************************************************************
   Create Tables
********************************************************************************/
CREATE TABLE `Album`
(
    `AlbumId` INT NOT NULL AUTO_INCREMENT,
    `Name` NVARCHAR(160) NOT NULL,
    `ArtistId` INT NOT NULL,
    CONSTRAINT `PK_Album` PRIMARY KEY  (`AlbumId`)
);

CREATE TABLE `Artist`
(
    `ArtistId` INT NOT NULL AUTO_INCREMENT,
    `Name` NVARCHAR(120),
    CONSTRAINT `PK_Artist` PRIMARY KEY  (`ArtistId`)
);

CREATE TABLE `Customer`
(
    `CustomerId` INT NOT NULL AUTO_INCREMENT,
    `FirstName` NVARCHAR(40) NOT NULL,
    `LastName` NVARCHAR(20) NOT NULL,
    `MiddleName` NVARCHAR(20) NOT NULL,
    `Company` NVARCHAR(80),
    `Street` NVARCHAR(70),
    `City` NVARCHAR(40),
    `State` NVARCHAR(40),
    `Country` NVARCHAR(40),
    `PostalCode` NVARCHAR(10),
    `Phone` NVARCHAR(24),
    `Fax` NVARCHAR(24),
    `Email` NVARCHAR(60) NOT NULL,
    `SupportRepId` INT,
    CONSTRAINT `PK_Customer` PRIMARY KEY  (`CustomerId`)
);

CREATE TABLE `Employee`
(
    `EmployeeId` INT NOT NULL AUTO_INCREMENT,
    `LastName` NVARCHAR(20) NOT NULL,
    `FirstName` NVARCHAR(20) NOT NULL,
    `Title` NVARCHAR(30),
    `ReportsTo` INT,
    `BirthDate` DATETIME,
    `HireDate` DATETIME,
    `Address` NVARCHAR(70),
    `City` NVARCHAR(40),
    `State` NVARCHAR(40),
    `Country` NVARCHAR(40),
    `PostalCode` NVARCHAR(10),
    `Phone` NVARCHAR(24),
    `Fax` NVARCHAR(24),
    `Email` NVARCHAR(60),
    CONSTRAINT `PK_Employee` PRIMARY KEY  (`EmployeeId`)
);

CREATE TABLE `Genre`
(
    `GenreId` INT NOT NULL AUTO_INCREMENT,
    `Name` NVARCHAR(120),
    CONSTRAINT `PK_Genre` PRIMARY KEY  (`GenreId`)
);

CREATE TABLE `Genre_Backup`
(
    `GenreId` INT NOT NULL AUTO_INCREMENT,
    `Name` NVARCHAR(120),
    CONSTRAINT `PK_GenreBackup` PRIMARY KEY  (`GenreId`)
);

CREATE TABLE `Invoice`
(
    `InvoiceId` INT NOT NULL AUTO_INCREMENT,
    `CustomerId` INT NOT NULL,
    `InvoiceDate` DATETIME NOT NULL,
    `BillingAddress` NVARCHAR(70),
    `BillingCity` NVARCHAR(40),
    `BillingState` NVARCHAR(40),
    `BillingCountry` NVARCHAR(40),
    `BillingPostalCode` NVARCHAR(10),
    `Total` NUMERIC(10,2) NOT NULL,
    CONSTRAINT `PK_Invoice` PRIMARY KEY  (`InvoiceId`)
);


CREATE TABLE `MediaType`
(
    `MediaTypeId` INT NOT NULL AUTO_INCREMENT,
    `Name` NVARCHAR(120),
    CONSTRAINT `PK_MediaType` PRIMARY KEY  (`MediaTypeId`)
);

CREATE TABLE `Playlist`
(
    `PlaylistId` INT NOT NULL AUTO_INCREMENT,
    `Name` NVARCHAR(120),
    CONSTRAINT `PK_Playlist` PRIMARY KEY  (`PlaylistId`)
);

CREATE TABLE `PlaylistTrack`
(
    `PlaylistId` INT NOT NULL,
    `TrackId` INT NOT NULL,
    CONSTRAINT `PK_PlaylistTrack` PRIMARY KEY  (`PlaylistId`, `TrackId`)
);

CREATE TABLE `Track`
(
    `TrackId` INT NOT NULL AUTO_INCREMENT,
    `Name` NVARCHAR(200) NOT NULL,
    `AlbumId` INT,
    `MediaTypeId` INT NOT NULL,
    `GenreId` INT,
    `Composer` NVARCHAR(220),
    `Milliseconds` INT NOT NULL,
    `Bytes` INT,
    `UnitPrice` NUMERIC(10,2) NOT NULL,
    CONSTRAINT `PK_Track` PRIMARY KEY  (`TrackId`)
);



/*******************************************************************************
   Create Primary Key Unique Indexes
********************************************************************************/

/*******************************************************************************
   Create Foreign Keys
********************************************************************************/
ALTER TABLE `Album` ADD CONSTRAINT `FK_AlbumArtistId`
    FOREIGN KEY (`ArtistId`) REFERENCES `Artist` (`ArtistId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX `IFK_AlbumArtistId` ON `Album` (`ArtistId`);

ALTER TABLE `Customer` ADD CONSTRAINT `FK_CustomerSupportRepId`
    FOREIGN KEY (`SupportRepId`) REFERENCES `Employee` (`EmployeeId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX `IFK_CustomerSupportRepId` ON `Customer` (`SupportRepId`);

ALTER TABLE `Employee` ADD CONSTRAINT `FK_EmployeeReportsTo`
    FOREIGN KEY (`ReportsTo`) REFERENCES `Employee` (`EmployeeId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX `IFK_EmployeeReportsTo` ON `Employee` (`ReportsTo`);

ALTER TABLE `Invoice` ADD CONSTRAINT `FK_InvoiceCustomerId`
    FOREIGN KEY (`CustomerId`) REFERENCES `Customer` (`CustomerId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX `IFK_InvoiceCustomerId` ON `Invoice` (`CustomerId`);

ALTER TABLE `PlaylistTrack` ADD CONSTRAINT `FK_PlaylistTrackPlaylistId`
    FOREIGN KEY (`PlaylistId`) REFERENCES `Playlist` (`PlaylistId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX `IFK_PlaylistTrackPlaylistId` ON `PlaylistTrack` (`PlaylistId`);

ALTER TABLE `PlaylistTrack` ADD CONSTRAINT `FK_PlaylistTrackTrackId`
    FOREIGN KEY (`TrackId`) REFERENCES `Track` (`TrackId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX `IFK_PlaylistTrackTrackId` ON `PlaylistTrack` (`TrackId`);

ALTER TABLE `Track` ADD CONSTRAINT `FK_TrackAlbumId`
    FOREIGN KEY (`AlbumId`) REFERENCES `Album` (`AlbumId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX `IFK_TrackAlbumId` ON `Track` (`AlbumId`);

ALTER TABLE `Track` ADD CONSTRAINT `FK_TrackGenreId`
    FOREIGN KEY (`GenreId`) REFERENCES `Genre` (`GenreId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX `IFK_TrackGenreId` ON `Track` (`GenreId`);

ALTER TABLE `Track` ADD CONSTRAINT `FK_TrackMediaTypeId`
    FOREIGN KEY (`MediaTypeId`) REFERENCES `MediaType` (`MediaTypeId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX `IFK_TrackMediaTypeId` ON `Track` (`MediaTypeId`);

