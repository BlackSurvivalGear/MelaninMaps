export const DIASPORA_COMMUNITIES = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "id": "brixton-london",
            "properties": {
                "name": "Brixton",
                "city": "London",
                "country": "United Kingdom",
                "classification": "Major Community",
                "color": "green",
                "population": "78,000",
                "size": "Medium",
                "description": "A vibrant multicultural area with a deep-rooted Afro-Caribbean community. Famous for Brixton Market and its musical heritage.",
                "localBusinesses": 450,
                "restaurants": 120,
                "groceryStores": 35,
                "culturalCentres": 8,
                "faithOrganisations": 15
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-0.125, 51.465],
                    [-0.115, 51.465],
                    [-0.110, 51.460],
                    [-0.115, 51.455],
                    [-0.125, 51.455],
                    [-0.130, 51.460],
                    [-0.125, 51.465]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "harlem-nyc",
            "properties": {
                "name": "Harlem",
                "city": "New York City",
                "country": "United States",
                "classification": "Major Community",
                "color": "green",
                "population": "116,000",
                "size": "Large",
                "description": "Known as the cultural capital of Black America, Harlem has a rich history of art, music, and civil rights activism.",
                "localBusinesses": 800,
                "restaurants": 210,
                "groceryStores": 60,
                "culturalCentres": 15,
                "faithOrganisations": 40
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-73.955, 40.825],
                    [-73.945, 40.825],
                    [-73.935, 40.815],
                    [-73.945, 40.805],
                    [-73.955, 40.805],
                    [-73.965, 40.815],
                    [-73.955, 40.825]
                ]]
            }
        },
        {
            "type": "Feature",
            "id": "yaba-lagos",
            "properties": {
                "name": "Yaba",
                "city": "Lagos",
                "country": "Nigeria",
                "classification": "Established Community",
                "color": "yellow",
                "population": "250,000",
                "size": "Large",
                "description": "Lagos' tech hub and educational centre, home to many startups and established local businesses.",
                "localBusinesses": 1200,
                "restaurants": 300,
                "groceryStores": 85,
                "culturalCentres": 12,
                "faithOrganisations": 55
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [3.37, 6.51],
                    [3.39, 6.51],
                    [3.40, 6.50],
                    [3.39, 6.49],
                    [3.37, 6.49],
                    [3.36, 6.50],
                    [3.37, 6.51]
                ]]
            }
        }
    ]
};

export const EVENTS = [
    {
        id: "event-1",
        name: "Pan-African Tech Summit",
        type: "Conference",
        location: [6.5244, 3.3792], // Lagos
        date: "2026-05-15",
        description: "Connecting tech leaders across the continent."
    },
    {
        id: "event-2",
        name: "Brixton Summer Festival",
        type: "Festival",
        location: [51.4613, -0.1156], // London
        date: "2026-07-20",
        description: "A celebration of Caribbean culture and music."
    }
];

export const PUBLIC_TRANSPORT = [
    { name: "Brixton Tube Station", type: "Metro", location: [51.4626, -0.1147] },
    { name: "Grand Central Terminal", type: "Train", location: [40.7527, -73.9772] },
    { name: "Murtala Muhammed International Airport", type: "Airport", location: [6.5774, 3.3210] }
];

export const CONNECTIVITY = [
    { name: "Yaba Tech Hub", type: "Coworking", location: [6.5061, 3.3758], wifi: "Free High-Speed" },
    { name: "Harlem Library", type: "Free Wi-Fi", location: [40.8078, -73.9431], wifi: "Public" }
];

export const TOURIST_HIGHLIGHTS = [
    { name: "Nelson Mandela Square", type: "Landmark", location: [-26.1076, 28.0543] },
    { name: "Black Cultural Archives", type: "Museum", location: [51.4610, -0.1150] },
    { name: "Apollo Theater", type: "Historic Site", location: [40.8101, -73.9503] }
];
