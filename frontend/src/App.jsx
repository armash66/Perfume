import PoliciesPage from './components/Policies';
import SignatureCollection from './components/SignatureCollection';

function App() {
  return (
    <div className="flex flex-col gap-0">
      <SignatureCollection />
      <PoliciesPage />
    </div>
  );
}

export default App;
