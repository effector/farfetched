import { render } from 'solid-js/web';
import { attachFarfetchedDevTools } from '@farfetched/dev-tools';

import { App } from './app';

render(() => <App />, document.getElementById('root') as HTMLElement);

attachFarfetchedDevTools({ logErrorsToConsole: true });
