import { getRouteDetails } from '../src/services/busPosition';

async function main() {
  const route = await getRouteDetails('b5523a05-6b2f-4bc4-99f6-cb7494f75b8b');
  console.log(JSON.stringify(route, null, 2));
}

main().catch(console.error);
