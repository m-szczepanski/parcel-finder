import express from 'express';
import cors from 'cors';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());

app.get('/api/overpass', async (req, res) => {
  const bbox = req.query.bbox as string | undefined;

  if (!bbox) {
    res.status(400).json({ error: 'bbox query param is required' });
    return;
  }

  try {
    const response = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(`
      [out:json][timeout:25];
      (
        way["building"](${bbox});
        way["landuse"](${bbox});
        way["natural"](${bbox});
        way["leisure"](${bbox});
      );
      out body geom;
      >;
      out skel qt;
    `)}`,
    );

    if (!response.ok) {
      res.status(502).json({ error: 'Overpass request failed' });
      return;
    }

    const json = await response.json();
    res.json(json);
  } catch (error) {
    console.error('Overpass request failed:', error);
    res.status(502).json({ error: 'Overpass request failed' });
  }
});

app.listen(port, () => {
  console.log(`Parcel Finder proxy listening on http://localhost:${port}`);
});
