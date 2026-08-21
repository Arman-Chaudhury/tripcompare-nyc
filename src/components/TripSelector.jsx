import { ArrowLeftRight } from 'lucide-react';
import PlacePicker from './PlacePicker.jsx';

export default function TripSelector({ origin, setOrigin, destination, setDestination, t }) {
  const swap = () => { const o = origin; setOrigin(destination); setDestination(o); };
  return (
    <section className="panel trip" aria-label={`${t('from')} / ${t('to')}`}>
      <PlacePicker id="origin" label={t('from')} place={origin} setPlace={setOrigin} t={t} />
      <button type="button" className="swap" onClick={swap} aria-label={t('swap')} title={t('swap')}>
        <ArrowLeftRight size={18} aria-hidden="true" />
      </button>
      <PlacePicker id="destination" label={t('to')} place={destination} setPlace={setDestination} t={t} />
    </section>
  );
}
