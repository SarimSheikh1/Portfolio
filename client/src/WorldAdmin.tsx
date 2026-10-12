import Admin from './Admin';
import adminStyles from './style.css?inline';

export default function WorldAdmin() {
  return <><style>{adminStyles}</style><header className="wrap" style={{padding: '24px'}}><a href="/">? Back to World Agentic</a></header><Admin/></>;
}
