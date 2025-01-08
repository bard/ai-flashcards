```sh
git clone https://github.com/...
cd ...
pnpm install
```

```sh
export OPENAI_API_KEY=sk-proj-...
export EXTRACTOR=jina-openai
export MAX_SERVICES_TO_SCRAPE=2
export LOADER=file-csv
export LOAD_TARGET=/tmp/flashcards.csv
pnpm etl:run

curl -X POST -H 'content-type: text/csv' \
  -H 'x-api-key: bigsecret \
  --data-binary '@flashcards.csv' \
  http://localhost:3000/api/admin/db/load
```
