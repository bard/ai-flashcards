For educational purpose only.

This tool retrieves information from the trending page at [There's an AI for that](https://theresanaiforthat.com/) about services that use AI, categorizes them based on _fields_ they operate in, _goals_ they pursue, and AI-based _methods_ they employ, and generates flashcards where the question side describes two among those features, and asks you to guess the third one. Example:

> A service in the online dating field wants to better match users. What AI-based method could it use?

The other side of the flashcard contains the answer as well as more information about the service. Example:

> Compare locations in profile photos. For an example of a service doing this, see https://...

The aim is to train your intuitions about use cases for AI in products and services.

After generating the flashcards, you can import them in the companion app [simple-flashcards](http://github.com/bard/simple-flashcards) (see its [README](http://github.com/bard/simple-flashcards) for instructions) or in other flashcard applications that support CSV import, such as Anki.

## Running

```sh
git clone https://github.com/bard/ai-flashcards
cd ai-flashcards
pnpm install

export OPENAI_API_KEY=sk-proj-...
export EXTRACTOR=jina-openai
export MAX_SERVICES_TO_SCRAPE=2
export LOADER=file-csv
export LOAD_TARGET=/tmp/flashcards.csv
pnpm etl:run
```
