// Hotels within a short shuttle ride of each airport, for a stranded
// passenger who needs a bed tonight. No live prices: no free hotel-rate API
// exists and a wrong number is worse than none, so each row links to a map
// search and the tab links to a live hotel search. `shuttle` is what the
// hotel advertised when checked; passengers should call to confirm the last
// van. `miles` is from the terminals, approximate.
export const HOTELS_LAST_CHECKED = '2026-10-16';

export const hotels = {
  JFK: [
    { name: 'TWA Hotel', area: 'On airport (Terminal 5)', miles: 0, shuttle: 'walk', note: 'Walk from Terminal 5 or ride the free AirTrain from any terminal. Day rooms sold too.' },
    { name: 'Hilton New York JFK Airport', area: 'Jamaica', miles: 2.5, shuttle: true },
    { name: 'Courtyard by Marriott New York JFK Airport', area: 'Jamaica', miles: 2.5, shuttle: true },
    { name: 'Crowne Plaza JFK Airport', area: 'Jamaica', miles: 2.5, shuttle: true },
    { name: 'Hilton Garden Inn JFK Airport', area: 'Jamaica', miles: 2.5, shuttle: true },
    { name: 'Hampton Inn JFK Airport', area: 'Jamaica', miles: 2.5, shuttle: true },
    { name: 'Radisson Hotel JFK Airport', area: 'Jamaica', miles: 2.5, shuttle: true },
    { name: 'Holiday Inn Express JFK Airport', area: 'Jamaica', miles: 2.5, shuttle: true },
  ],
  LGA: [
    { name: 'New York LaGuardia Airport Marriott', area: 'East Elmhurst', miles: 1, shuttle: true },
    { name: 'Courtyard by Marriott New York LaGuardia Airport', area: 'East Elmhurst', miles: 1, shuttle: true },
    { name: 'Hampton Inn New York LaGuardia Airport', area: 'East Elmhurst', miles: 1, shuttle: true },
    { name: 'LaGuardia Plaza Hotel', area: 'East Elmhurst', miles: 1, shuttle: true },
    { name: 'Hilton Garden Inn New York LaGuardia Airport', area: 'East Elmhurst', miles: 1.5, shuttle: true },
    { name: 'Holiday Inn LaGuardia Airport', area: 'East Elmhurst', miles: 1.5, shuttle: true },
  ],
  EWR: [
    { name: 'Newark Liberty International Airport Marriott', area: 'On airport', miles: 0, shuttle: 'walk', note: 'On the airport loop road; the hotel runs its own shuttle to every terminal around the clock.' },
    { name: 'Courtyard by Marriott Newark Liberty International Airport', area: 'Newark', miles: 2, shuttle: true },
    { name: 'Hilton Newark Airport', area: 'Elizabeth', miles: 2, shuttle: true },
    { name: 'Hampton Inn Newark Airport', area: 'Elizabeth', miles: 2, shuttle: true },
    { name: 'DoubleTree by Hilton Newark Airport', area: 'Newark', miles: 2, shuttle: true },
    { name: 'Holiday Inn Newark Airport', area: 'Elizabeth', miles: 2.5, shuttle: true },
    { name: 'Renaissance Newark Airport Hotel', area: 'Elizabeth', miles: 2, shuttle: true },
  ],
};
