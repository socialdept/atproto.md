import { renderLexiconBody } from '../lexicon';
import { register } from './registry';

register({
	'com.atproto.lexicon.schema': (record) => renderLexiconBody(record.value as Record<string, unknown>),
});
