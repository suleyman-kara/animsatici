// Repo etiketlerini oluşturur (zaten varsa dokunmaz). GITHUB_TOKEN + GITHUB_REPOSITORY gerekir.
import { githubClient, REPO_LABELS } from "../lib/github";

await githubClient().ensureLabels();
console.log(`✓ Etiketler hazır: ${REPO_LABELS.map((l) => l.name).join(", ")}`);
