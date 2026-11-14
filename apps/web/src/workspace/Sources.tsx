import { Section } from './shared';
export function Sources() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DONNÉES / PROVENANCE</p>
          <h1>
            Des faits pour explorer.
            <br />
            Des hypothèses pour planifier.
          </h1>
          <p>
            Les observations de Perseverance décrivent les sites. Elles ne
            mesurent ni la marche ni la consommation d’un astronaute.
          </p>
        </div>
      </div>
      <div className="mission-grid">
        {[
          [
            'Mars Trek · EPSC 2017',
            'Cartographie, sélection de sites et outils d’analyse : référence pour rapprocher les données et le parcours.',
            'https://meetingorganizer.copernicus.org/EPSC2017/EPSC2017-99.pdf',
          ],
          [
            'AEGIS · NASA / open source',
            'Organisation d’une sortie en stations, points d’intérêt et activités. Inspiration d’architecture ; aucun code de ce projet n’a été copié.',
            'https://github.com/nasa/aegis',
          ],
          [
            'Échantillons de Jezero · EPSC 2024',
            'Contexte scientifique des trois sites, minéralogie et observations accompagnant les prélèvements.',
            'https://meetingorganizer.copernicus.org/EPSC2024/EPSC2024-1049.html',
          ],
          [
            'NASA JPL · septembre 2022',
            'Observations de Skinner Ridge et Wildcat Ridge. Matière organique ne signifie pas preuve de vie.',
            'https://www.jpl.nasa.gov/news/nasas-perseverance-rover-investigates-geologically-rich-mars-terrain/',
          ],
          [
            'Scientific American · septembre 2022',
            'Contexte journalistique fourni pour les découvertes du delta ; les fiches privilégient les publications scientifiques et NASA.',
            'https://www.scientificamerican.com/article/perseverance-mars-rover-makes-fantastic-find-in-search-for-past-life/',
          ],
          [
            'CNN · septembre 2022',
            'Lien de contexte fourni. Page inaccessible pendant cette recherche ; aucune donnée supplémentaire n’en a été importée.',
            'https://amp.cnn.com/cnn/2022/09/15/world/perseverance-rover-mars-images-scn',
          ],
        ].map(([title, text, url]) => (
          <article className="work-card" key={title}>
            <span className="eyebrow">RÉFÉRENCE</span>
            <h2>{title}</h2>
            <p>{text}</p>
            <a href={url} target="_blank" rel="noreferrer">
              Consulter la source ↗
            </a>
          </article>
        ))}
      </div>
      <Section title="Les données utilisées par votre mission">
        <p>
          Positions et identifiants des sites, imagerie et relief proviennent du
          manifeste figé livré avec l’application. Les photos et leurs crédits
          proviennent des fiches scientifiques sourcées NASA.
        </p>
        <p>
          Les exemples ajoutent seulement un camp fictif et un programme
          d’activités. Les temps d’observation et de prélèvement ne sont pas des
          durées opérationnelles NASA validées.
        </p>
        <p>
          Les missions et leurs versions sont enregistrées dans ce navigateur.
          Exportez le JSON pour conserver une copie extérieure à cet appareil.
        </p>
      </Section>
    </>
  );
}
