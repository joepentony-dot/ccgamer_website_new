import games from "./games.js";
import publisherArchive from "./publisherArchive.js";
import collectionArchive from "./collectionArchive.js";

const siteUrl = "https://www.cheekycommodoregamer.co.uk";

const website = {
  "@type": "WebSite",
  name: "Cheeky Commodore Gamer",
  url: `${siteUrl}/`
};

const gamesCanonical = `${siteUrl}/games/`;
const publishersCanonical = `${siteUrl}/games/publishers/`;
const collectionsCanonical = `${siteUrl}/games/collections/`;
const zzapCanonical = `${siteUrl}/zzap64/`;

const gamesGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${gamesCanonical}#games-archive`,
      url: gamesCanonical,
      name: "C64 & Amiga Games Archive",
      description: "Explore the Cheeky Commodore Gamer C64 and Amiga games archive with searchable game pages, reviews, ratings, videos, genres, publishers, release years, collections and manuals.",
      isPartOf: website,
      about: [
        { "@type": "Thing", name: "Commodore 64 games" },
        { "@type": "Thing", name: "Amiga games" },
        { "@type": "Thing", name: "Retro gaming" }
      ]
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "C64 & Amiga Games Archive", item: gamesCanonical }
      ]
    }
  ]
};

const publisherItems = publisherArchive.items.map((publisher, index) => ({
  "@type": "ListItem",
  position: index + 1,
  name: publisher.name,
  url: `${publishersCanonical}${publisher.slug}/`
}));

const publishersGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      name: "C64 & Amiga Game Publishers",
      description: "Browse Commodore 64 and Amiga games by publisher, including Ocean Software, Mastertronic, Firebird, US Gold, Codemasters, System 3 and many more.",
      url: publishersCanonical,
      isPartOf: website
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "Games", item: gamesCanonical },
        { "@type": "ListItem", position: 3, name: "Publishers", item: publishersCanonical }
      ]
    },
    {
      "@type": "ItemList",
      name: "Publisher archives",
      numberOfItems: publisherItems.length,
      itemListElement: publisherItems
    }
  ]
};

const collectionItems = collectionArchive.items.map((collection, index) => ({
  "@type": "ListItem",
  position: index + 1,
  name: collection.name,
  url: `${collectionsCanonical}${collection.slug}/`
}));

const collectionsGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${collectionsCanonical}#page`,
      url: collectionsCanonical,
      name: "Commodore 64 and Amiga Game Collections",
      description: "Curated Commodore 64 and Amiga game collections covering cartridge releases, licensed games, CCG favourites, retro events, special features and Amiga demo music.",
      isPartOf: website,
      breadcrumb: { "@id": `${collectionsCanonical}#breadcrumb` },
      mainEntity: { "@id": `${collectionsCanonical}#collections` }
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${collectionsCanonical}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "Games", item: gamesCanonical },
        { "@type": "ListItem", position: 3, name: "Collections", item: collectionsCanonical }
      ]
    },
    {
      "@type": "ItemList",
      "@id": `${collectionsCanonical}#collections`,
      name: "Curated Commodore 64 and Amiga collections",
      numberOfItems: collectionItems.length,
      itemListElement: collectionItems
    }
  ]
};

const zzapGraph = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Zzap!64 Reviews & Awards Archive",
  description: "A searchable archive of verified Zzap!64 review scans linked to Cheeky Commodore Gamer game pages, together with Gold Medals, Sizzlers and Silver Medals.",
  url: zzapCanonical,
  isPartOf: website
};

if (!games.length) {
  throw new Error("[ccg-eleventy] Cannot build archive hub schema without games.");
}
if (publisherItems.length !== publisherArchive.count) {
  throw new Error("[ccg-eleventy] Publisher hub schema count does not match publisher archive.");
}
if (collectionItems.length !== collectionArchive.count) {
  throw new Error("[ccg-eleventy] Collection hub schema count does not match collection archive.");
}

export default {
  games: JSON.stringify(gamesGraph),
  publishers: JSON.stringify(publishersGraph),
  collections: JSON.stringify(collectionsGraph),
  zzap64: JSON.stringify(zzapGraph)
};
