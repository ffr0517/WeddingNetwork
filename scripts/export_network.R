# export_network.R
# Reads private CSV data from the R analysis project and exports an
# anonymised network.json for the interactive web app.
# Run from the 'scripts/' directory or adjust paths as needed.
#
# PRIVACY: This script reads files containing real names but outputs ONLY
# wedding IDs. Never commit the source CSVs to the web-app repo.

library(tidyverse)
library(igraph)
library(jsonlite)

# ---------------------------------------------------------------------------
# 0. Paths  (adjust DATA_DIR if running from a different working directory)
# ---------------------------------------------------------------------------
DATA_DIR  <- "../../Wedding Network"   # relative to scripts/
OUT_FILE  <- "../public/data/network.json"

# ---------------------------------------------------------------------------
# 1. Load data  (identical pre-processing to wedding_network.R)
# ---------------------------------------------------------------------------
wed  <- read.csv(file.path(DATA_DIR, "wedding_guests.csv"))
meta <- read.csv(file.path(DATA_DIR, "wedding_meta.csv"))

wed[is.na(wed)] <- 0

# Remove rows that are all-zero
wed <- wed %>% filter(if_any(-1, ~ .x != 0))

mat           <- wed[, -1]
rownames(mat) <- wed$NAME
mat           <- as.matrix(mat)

# Symmetrise + binarise
mat <- (mat + t(mat)) > 0
mat <- 1 * mat
diag(mat) <- 0

# Build igraph object
g <- graph_from_adjacency_matrix(mat, mode = "undirected", diag = FALSE)

# Attach metadata
meta <- meta %>% mutate(NAME = trimws(as.character(NAME)))
V(g)$name <- trimws(as.character(V(g)$name))

meta2 <- meta %>% slice(match(V(g)$name, NAME))
stopifnot(nrow(meta2) == vcount(g))
for (cc in setdiff(names(meta2), "NAME")) {
  g <- set_vertex_attr(g, name = cc, value = meta2[[cc]])
}

# ---------------------------------------------------------------------------
# 2. Community detection  (same seed as original)
# ---------------------------------------------------------------------------
set.seed(081426)
sping <- cluster_spinglass(
  g,
  weights        = NULL,
  spins          = 15,
  parupdate      = FALSE,
  start.temp     = 1,
  stop.temp      = 0.01,
  cool.fact      = 0.99,
  gamma          = 1,
  implementation = "orig"
)

sping_palette <- c("#efebe4", "#902125", "#5b3a4b", "#efcaca", "#80956d")

sping_comm        <- as.integer(factor(V(g)$community))
V(g)$community    <- membership(sping)
V(g)$comm_colour  <- sping_palette[as.integer(factor(V(g)$community))]

hex_to_community <- c(
  "#efcaca" = "Rose",
  "#efebe4" = "Ivory",
  "#902125" = "Burgundy",
  "#80956d" = "Forest Green",
  "#5b3a4b" = "Plum"
)

# ---------------------------------------------------------------------------
# 3. Network metrics
# ---------------------------------------------------------------------------
gu <- as_undirected(g, mode = "collapse")
gu <- simplify(gu, remove.multiple = TRUE, remove.loops = TRUE)
n  <- vcount(gu)

degree_vec       <- degree(gu)
betweenness_vec  <- betweenness(gu, normalized = TRUE)
eigenvector_vec  <- eigen_centrality(gu, directed = FALSE, scale = TRUE)$vector
pagerank_vec     <- page_rank(gu, directed = FALSE)$vector
clustering_vec   <- transitivity(gu, type = "local", isolates = "zero")
coreness_vec     <- coreness(gu)
constraint_vec   <- tryCatch(constraint(gu), error = function(e) rep(NA_real_, n))

metrics_full <- tibble(
  NAME             = V(gu)$name,
  degree           = degree_vec,
  betweenness      = betweenness_vec,
  pagerank         = pagerank_vec,
  eigenvector      = eigenvector_vec,
  clustering_local = clustering_vec,
  coreness         = coreness_vec,
  constraint       = constraint_vec
)

# ---------------------------------------------------------------------------
# 4. Personalized descriptions  (same logic as wedding_network.R)
# ---------------------------------------------------------------------------
metric_cols <- c("degree","betweenness","pagerank","eigenvector",
                 "clustering_local","coreness","constraint")

Z          <- scale(metrics_full[metric_cols])
max_metric <- apply(abs(Z), 1, which.max)

noteworthy <- tibble(
  NAME      = metrics_full$NAME,
  statistic = metric_cols[max_metric],
  z_score   = Z[cbind(seq_len(nrow(Z)), max_metric)]
)

labels_wedding_extended <- list(
  degree = list(
    high = "someone who brings lots of people together, and we hope you feel just as surrounded on the day.",
    low  = "someone who keeps a close and meaningful circle, and we hope you feel right at home with us on the day."
  ),
  betweenness = list(
    high = "a natural connector who links different circles of friends, and we hope you help make new connections on the day.",
    low  = "someone who helps keep their circles close and strong, and we hope you feel that same warmth on the day."
  ),
  pagerank = list(
    high = "someone many people know and feel connected to, and we hope you feel all that love all around you on the day.",
    low  = "someone with a unique place in our life, and we hope the day feels just as unique for you."
  ),
  eigenvector = list(
    high = "closely connected with others who know lots of people, and we hope you enjoy sharing the day together.",
    low  = "someone whose friendships span different circles, and we hope you feel comfortable wherever you find yourself on the day."
  ),
  clustering_local = list(
    high = "part of our wonderfully close-knit group of friends, and we hope you get to enjoy that closeness on the day.",
    low  = "someone who brings different friends together, and we hope the day brings those worlds together too."
  ),
  coreness = list(
    high = "right at the heart of many of our friendships, and we hope you feel just how important you are to us.",
    low  = "a gentle bridge between different parts of our world, and we hope the day feels just as welcoming."
  ),
  constraint = list(
    high = "deeply connected to an important part of our lives, and we hope you feel that importance all around you on the day.",
    low  = "someone who naturally connects people who might not otherwise meet, and we hope the day feels full of those moments."
  )
)

noteworthy$description <- mapply(function(stat, z) {
  dir <- ifelse(z > 0, "high", "low")
  paste("To us, you're", labels_wedding_extended[[stat]][[dir]])
}, noteworthy$statistic, noteworthy$z_score)

# ---------------------------------------------------------------------------
# 5. Wedding IDs  (identical mapping to wedding_network.R)
# ---------------------------------------------------------------------------
wedding_ids <- metrics_full %>%
  arrange(desc(betweenness)) %>%
  mutate(
    wedding_id = as.character(row_number()),
    wedding_id = case_when(
      NAME == "Krizia"          ~ "BRIDE",
      NAME == "Luke"            ~ "GROOM",
      NAME == "Kendalee.Olmo"   ~ "A1",
      NAME == "Jennifer.Rhodes" ~ "1A",
      TRUE                      ~ wedding_id
    )
  ) %>%
  select(NAME, wedding_id)

# ---------------------------------------------------------------------------
# 6. Edge predictions  (ERGM is slow – we replicate from the original output)
#    If the original workspace is available, load it; otherwise re-run ERGM.
# ---------------------------------------------------------------------------
rdata_path <- file.path(DATA_DIR, ".RData")
if (file.exists(rdata_path)) {
  message("Loading saved workspace for ERGM predictions…")
  env_load <- new.env()
  load(rdata_path, envir = env_load)

  if (exists("edge_predictions", envir = env_load)) {
    edge_predictions <- get("edge_predictions", envir = env_load)
  } else if (exists("final_combined", envir = env_load)) {
    fc <- get("final_combined", envir = env_load)
    edge_predictions <- fc %>% select(node_i = NAME, best_new_match)
  } else {
    edge_predictions <- NULL
    message("Warning: ERGM predictions not found in workspace – match field will be NA.")
  }
} else {
  edge_predictions <- NULL
  message("Warning: No .RData found – ERGM match field will be NA.")
}

# ---------------------------------------------------------------------------
# 7. Layout  (same seed and parameters as save_ego_constellation())
# ---------------------------------------------------------------------------
rotate_layout <- function(layout, angle_degrees) {
  angle <- angle_degrees * pi / 180
  R     <- matrix(c(cos(angle), -sin(angle), sin(angle), cos(angle)), nrow = 2)
  layout %*% R
}

stretch_layout <- function(layout, x = 1, y = 1) {
  layout[, 1] <- layout[, 1] * x
  layout[, 2] <- layout[, 2] * y
  layout
}

set.seed(081426)
layout_fr <- layout_with_fr(g)
coords    <- layout_fr |>
  rotate_layout(-98) |>
  stretch_layout(x = 2.2, y = 0.6)
rownames(coords) <- V(g)$name

# Node sizes  (re-seed so rnorm is deterministic)
set.seed(081426)
node_sizes <- rnorm(vcount(g), mean = 30, sd = 8)
node_sizes <- pmin(pmax(node_sizes, 10), 110)
node_sizes[V(g)$name %in% c("Krizia", "Luke")] <- 105

# ---------------------------------------------------------------------------
# 8. Backbone edges per community (MST on layout-space distances)
# ---------------------------------------------------------------------------
backbone_edges <- list()

for (comm_id in unique(V(g)$community)) {
  g_comm <- induced_subgraph(g, V(g)[community == comm_id])
  if (vcount(g_comm) < 2 || ecount(g_comm) == 0) next

  V(g_comm)$x <- coords[V(g_comm)$name, 1]
  V(g_comm)$y <- coords[V(g_comm)$name, 2]

  E(g_comm)$w <- apply(ends(g_comm, E(g_comm)), 1, function(e) {
    dx <- V(g_comm)[e[1]]$x - V(g_comm)[e[2]]$x
    dy <- V(g_comm)[e[1]]$y - V(g_comm)[e[2]]$y
    sqrt(dx^2 + dy^2)
  })

  g_mst     <- mst(g_comm, weights = E(g_comm)$w)
  mst_edges <- as.data.frame(ends(g_mst, E(g_mst), names = TRUE))
  names(mst_edges) <- c("source", "target")
  mst_edges$type   <- "backbone"
  backbone_edges   <- append(backbone_edges, list(mst_edges))
}

backbone_df <- bind_rows(backbone_edges)

# ---------------------------------------------------------------------------
# 9. All adjacency edges
# ---------------------------------------------------------------------------
adj_df <- as_data_frame(g, what = "edges")
names(adj_df) <- c("source", "target")
adj_df$type <- "adjacency"

# ---------------------------------------------------------------------------
# 10. Assemble final node table (anonymised)
# ---------------------------------------------------------------------------
final_combined <- noteworthy %>%
  left_join(wedding_ids, by = "NAME") %>%
  left_join(
    tibble(NAME = V(g)$name, community_hex = V(g)$comm_colour),
    by = "NAME"
  ) %>%
  mutate(community = hex_to_community[community_hex]) %>%
  left_join(metrics_full %>% select(NAME, degree), by = "NAME")

# Attach ERGM match predictions
if (!is.null(edge_predictions)) {
  final_combined <- final_combined %>%
    left_join(
      edge_predictions %>% rename(NAME = node_i),
      by = "NAME"
    ) %>%
    left_join(
      wedding_ids %>% rename(best_new_match = NAME, match_id = wedding_id),
      by = "best_new_match"
    )
} else {
  final_combined$best_new_match <- NA_character_
  final_combined$match_id       <- NA_character_
}

# Build node list
nodes_list <- final_combined %>%
  mutate(
    x    = coords[NAME, 1],
    y    = coords[NAME, 2],
    size = node_sizes[match(NAME, V(g)$name)]
  ) %>%
  transmute(
    id          = wedding_id,
    x           = round(x, 4),
    y           = round(y, 4),
    community   = community,
    communityHex= community_hex,
    size        = round(size, 2),
    description = description,
    matchId     = match_id,
    degree      = degree,
    isSpecial   = id %in% c("BRIDE", "GROOM")
  )

# ---------------------------------------------------------------------------
# 11. Replace names with IDs in edge tables
# ---------------------------------------------------------------------------
name_to_id <- setNames(wedding_ids$wedding_id, wedding_ids$NAME)

adj_df_anon <- adj_df %>%
  mutate(
    source = name_to_id[source],
    target = name_to_id[target]
  ) %>%
  filter(!is.na(source) & !is.na(target))

backbone_df_anon <- backbone_df %>%
  mutate(
    source = name_to_id[source],
    target = name_to_id[target]
  ) %>%
  filter(!is.na(source) & !is.na(target))

# ---------------------------------------------------------------------------
# 12. Build and write JSON
# ---------------------------------------------------------------------------
communities_list <- tibble(
  name = c("Rose", "Ivory", "Burgundy", "Forest Green", "Plum"),
  hex  = c("#efcaca", "#efebe4", "#902125", "#80956d", "#5b3a4b")
)

network_data <- list(
  nodes = nodes_list,
  edges = adj_df_anon %>% select(source, target),
  backboneEdges = backbone_df_anon %>% select(source, target),
  communities = communities_list,
  meta = list(
    nodeCount     = vcount(g),
    edgeCount     = ecount(g),
    communityCount = length(unique(V(g)$community)),
    seed          = 81426,
    rotation      = -98,
    stretchX      = 2.2,
    stretchY      = 0.6
  )
)

# Privacy check – ensure no real names appear in output
json_str <- toJSON(network_data, pretty = TRUE, auto_unbox = TRUE)

real_names <- V(g)$name[!V(g)$name %in% c("Krizia", "Luke")]
# (Krizia and Luke are the couple – their IDs BRIDE/GROOM are fine)
name_parts <- unlist(strsplit(real_names, "\\.| "))
name_parts <- name_parts[nchar(name_parts) > 3]  # skip short fragments

hits <- name_parts[sapply(name_parts, function(nm) grepl(nm, json_str, ignore.case = TRUE))]

if (length(hits) > 0) {
  warning("Possible real names detected in output: ", paste(hits, collapse = ", "))
  message("Review the JSON before committing.")
} else {
  message("Privacy check passed – no real names detected in output.")
}

write(json_str, OUT_FILE)
message("Written to: ", OUT_FILE)
message("Nodes: ", vcount(g), "  Edges: ", ecount(g),
        "  Backbone edges: ", nrow(backbone_df_anon))
