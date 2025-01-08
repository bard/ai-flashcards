```sh
git clone https://github.com/...
pnpm install
```

```sh
export OPENAI_API_KEY=sk-proj-...
export EXTRACTOR=jina-openai
export MAX_SERVICES=2
export LOADER=file-csv
export LOAD_TARGET=/tmp/flashcards.csv
pnpm etl:run
```
