# Luke & Krizia — Wedding Constellation

An interactive web app built as the digital counterpart to personalised wedding invitations. Each of 67 guests received a unique invite number; entering it here zooms the network into their personal constellation and reveals their place in our social world.

## What it does

- **Interactive network graph** — 67 guests, 412 connections, 5 social communities, visualised using D3.js with the same force-directed layout as the printed invitations
- **Personalised reveal** — entering an invite number smoothly zooms into that guest's ego-network, showing their direct connections (ego edges), community backbone (MST), and a card with their personalised network description and predicted best new match
- **Light / dark modes** — cream/white matching the invite aesthetic, or a dark starfield mode where nodes glow like constellations
- **Demo mode** — portfolio visitors can explore the network without a real invite number

## How it was made

The invitations were generated using social network analysis in R (`igraph`, `statnet`):

- **Community detection** via Spinglass algorithm (5 communities)
- **Personalized descriptions** based on each guest's most noteworthy network metric (degree, betweenness, eigenvector, clustering, coreness, constraint)
- **Match predictions** via Exponential Random Graph Model (ERGM) with homophily terms for group, gender, age band, and bride/groom side
- **Layout** via Fruchterman-Reingold, rotated −98° and stretched 2.2×/0.6× for a landscape constellation shape

The R analysis outputs an anonymised `network.json` (no real names — only invite numbers). The web app reads this to render the interactive constellation.

## Privacy

All node data is identified by **invite number only**. No real names, personal details, or identifiable information are stored in this repository or served by the app. The mapping between invite numbers and guest names exists only in the physical invitations.

## Stack

- **Next.js** (static export) + TypeScript
- **D3.js** for SVG rendering and zoom transitions
- **Framer Motion** for card animations
- **Tailwind CSS** + Cormorant Garamond (matching the invite typography)
- Deployed on **Vercel**

## Running locally

```bash
npm install
npm run dev
```

To regenerate `public/data/network.json` from source data (requires access to private guest CSVs):

```bash
cd scripts
Rscript export_network.R
```
