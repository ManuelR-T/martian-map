import { localize } from '@marps/ui';
import '../i18n';
import { useId, useState, type ReactNode } from 'react';
import { Globe, MapPinned, Power, RotateCw, TriangleAlert } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  BudgetBreakdown,
  Button,
  DataList,
  DataListItem,
  DataState,
  Panel,
  ProvenanceBadge,
  SegmentedControl,
  Skeleton,
  StepList,
  StepListItem,
  type BudgetLine,
} from '@marps/ui';

interface Swatch {
  readonly token: string;
  readonly name: string;
  readonly usage: string;
  /** Classes de fond et de texte : chaque paire est contrôlée par tokens.test.ts. */
  readonly className: string;
}

const swatches: readonly Swatch[] = [
  { token: 'primary', name: 'Bleu action', usage: 'Boutons principaux, liens et lueurs des volets', className: 'bg-primary text-primary-foreground' },
  { token: 'twilight', name: 'Bleu crépuscule', usage: 'Ambiance, lueurs et fonds bleu nuit', className: 'bg-twilight text-twilight-foreground' },
  { token: 'mars', name: 'Braise', usage: 'Sélection de vue, page active, étapes et parcours', className: 'bg-mars text-mars-foreground' },
  { token: 'header', name: 'Nuit', usage: 'Bandeau de navigation', className: 'bg-header text-header-foreground' },
  { token: 'background', name: 'Fond', usage: 'Fond de page bleu nuit', className: 'bg-background text-foreground' },
  { token: 'card', name: 'Surface', usage: 'Panneaux et contrôles', className: 'bg-card text-card-foreground' },
  { token: 'muted', name: 'Atténué', usage: 'Zones secondaires, squelettes', className: 'bg-muted text-muted-foreground' },
  { token: 'accent', name: 'Accent', usage: 'Survol, élément sélectionné', className: 'bg-accent text-accent-foreground' },
  { token: 'mars-surface', name: 'Poussière', usage: 'Terrain sous la carte', className: 'bg-mars-surface text-foreground' },
  { token: 'destructive', name: 'Rouge', usage: 'Suppression, dépassement', className: 'bg-destructive text-destructive-foreground' },
  { token: 'danger-surface', name: 'Erreur', usage: 'Échec de chargement, budget dépassé', className: 'bg-danger-surface text-danger' },
  { token: 'warning-surface', name: 'Vigilance', usage: 'Couverture insuffisante, valeur simulée', className: 'bg-warning-surface text-warning' },
  { token: 'success-surface', name: 'Conforme', usage: 'Budget respecté, valeur mesurée', className: 'bg-success-surface text-success' },
  { token: 'info-surface', name: 'Information', usage: 'Note, valeur calculée', className: 'bg-info-surface text-info' },
];

const fieldRules: readonly { readonly title: string; readonly text: string }[] = [
  {
    title: 'Des cibles pour une main gantée',
    text: 'Un bouton mesure 44 px de haut par défaut, jamais moins de 40. Le bandeau entier d\'un panneau le replie.',
  },
  {
    title: 'Un contraste vérifié à chaque build',
    text: 'Le texte principal dépasse 7:1, tout autre texte 4,5:1, les bordures de contrôle 3:1. Un test échoue sinon.',
  },
  {
    title: 'Jamais la couleur seule',
    text: 'Un état porte aussi un mot, une icône, une forme ou un motif : il se lit visière teintée ou écran délavé.',
  },
  {
    title: 'La lumière a un sens',
    text: 'Seuls rayonnent l\'action principale, la sélection et les alertes. Ce qui ne demande rien reste éteint.',
  },
];

const budgetLines: readonly BudgetLine[] = [
  { id: 'walk', label: 'Marche aller', value: '48 min', share: 0.2, pattern: 'solid' },
  { id: 'observations', label: 'Observations', value: '90 min', share: 0.375, pattern: 'hatched' },
  { id: 'return', label: 'Retour au camp', value: '36 min', share: 0.15, pattern: 'dotted' },
  { id: 'reserve', label: 'Réserve', value: '30 min', share: 0.125, pattern: 'crossed' },
];

const overBudgetLines: readonly BudgetLine[] = budgetLines.map((line) =>
  line.id === 'observations' ? { ...line, value: '150 min', share: 0.625 } : line,
);

/** Panneaux de la démonstration de mise sous tension, échelonnés comme sur l'écran de planification. */
const bootPanels: readonly { readonly title: string; readonly delay: string }[] = [
  { title: 'Étapes', delay: '[--power-delay:0ms]' },
  { title: 'Budget de temps', delay: '[--power-delay:120ms]' },
  { title: 'Fiche de site', delay: '[--power-delay:240ms]' },
];

type DemoView = 'global' | 'region';

function Section({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="border-b pb-4">
      <div className="py-3">
        <h3 id={id} className="heading-display text-2xl">
          {localize(title)}
        </h3>
      </div>
      <div className="grid gap-5 py-4">
        {intro ? <p className="max-w-prose text-muted-foreground">{localize(intro)}</p> : null}
        {localize(children)}
      </div>
    </section>
  );
}

export default function DesignSystemPage() {
  const [view, setView] = useState<DemoView>('region');
  const [selectedStep, setSelectedStep] = useState('wildcat');
  const [bootCount, setBootCount] = useState(0);

  return (
    <div className="[--scene-terrain:var(--mars)]">
      {/* Ouverture : le couchant bleu de Mars, toujours de nuit, dans la continuité du bandeau. */}
      <div className="dark stage-backdrop relative isolate overflow-hidden text-foreground">
        <div aria-hidden="true" className="graticule absolute inset-0 -z-10 opacity-50" />
        <div
          aria-hidden="true"
          className="planet-limb absolute top-[68%] left-1/2 -z-10 aspect-square w-[max(140%,64rem)] -translate-x-1/2"
        />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-linear-to-t from-background to-transparent" />
        <div className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
          <a href="#/" className="inline-flex min-h-11 items-center underline">{localize("Retour à la planification")}</a>
          <h2 className="heading-display text-3xl font-extrabold [font-stretch:125%] sm:text-4xl">{localize("Heure bleue")}</h2>
          <p className="mt-5 max-w-xl text-lg text-foreground/90">
            {localize("Sur Mars, le ciel de jour est caramel et le coucher de soleil est bleu. Le système de design de Marps part de cette inversion : le bleu du crépuscule habille les fonds, les boutons restent bleus, l’orange martien souligne les sélections et les repères.")} </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-14 px-5 py-10">
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>{localize("Contenus d'exemple")}</AlertTitle>
          <AlertDescription>
            <p>
              {localize("Les durées, étapes et fiches de cette page illustrent les composants. Ce ne sont ni des données scientifiques ni des résultats du moteur de mission.")} </p>
          </AlertDescription>
        </Alert>

        <Section
          title={localize("Conçu pour le terrain")}
          intro="L'effet ne passe jamais avant la lecture. Quatre règles tiennent dans tout le système."
        >
          <dl className="m-0 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {fieldRules.map((rule) => (
              <div key={rule.title}>
                <dt className="font-semibold">{localize(rule.title)}</dt>
                <dd className="m-0 mt-1 text-muted-foreground">{localize(rule.text)}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section
          title={localize("Couleurs")}
          intro="Une seule palette pour tous les écrans : une nuit de basalte, éclairée par le bleu du couchant."
        >
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {swatches.map((swatch) => (
              <li key={swatch.token} className={`border p-4 ${swatch.className}`}>
                <p className="font-semibold">{localize(swatch.name)}</p>
                <p className="text-sm">{localize(swatch.usage)}</p>
                <p className="mt-2 text-sm">
                  <code>{localize("--")}{localize(swatch.token)}</code>
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title={localize("Typographie")}
          intro="Archivo sur toute sa largeur pour les titres, les libellés en capitales et les relevés ; Public Sans pour le texte. Aucun texte sous 13 px ; les chiffres s'alignent en colonnes."
        >
          <div className="panel-frame relative grid gap-4 border bg-card p-6">
            <p className="numeral-display text-6xl">{localize("36 min")}</p>
            <p className="heading-display text-3xl">{localize("Préparer une sortie à Jezero")}</p>
            <p className="heading-display text-xl">{localize("Titre de section")}</p>
            <p className="label-caps">{localize("Titre de panneau, bouton, voyant")}</p>
            <p className="max-w-prose">
              {localize("Texte courant, 16 px. Une donnée absente reste absente : l'interface dit ce qui est mesuré, calculé, simulé ou inconnu, au plus près de la valeur concernée.")} </p>
            <p className="text-sm text-muted-foreground">{localize("Texte secondaire, 14 px, pour les précisions et les unités.")}</p>
            <p className="font-semibold tabular-nums">{localize("18,44° N, 77,58° E")}</p>
          </div>
        </Section>

        <Section
          title={localize("Lumière et surfaces")}
          intro="Un panneau posé sur la carte est un verre presque opaque, flouté derrière, coiffé du filet d'horizon et fermé par deux équerres de viseur. Hors de la carte, la même forme est pleine."
        >
          <div className="stage-backdrop relative isolate grid gap-4 overflow-hidden border p-5 sm:grid-cols-2 sm:p-8">
            <div aria-hidden="true" className="graticule absolute inset-0 -z-10" />
            <Panel title={localize("Panneau flottant")} description={localize("Sur la carte")} headingLevel={3} floating>
              <p className="text-sm">{localize("Le quadrillage reste perceptible derrière le verre, le texte garde son contraste.")}</p>
            </Panel>
            <Panel title={localize("Panneau plein")} description={localize("Dans une page")} headingLevel={3}>
              <p className="text-sm">{localize("Même filet, mêmes équerres, sans transparence ni ombre.")}</p>
            </Panel>
          </div>
        </Section>

        <Section
          title={localize("Actions")}
          intro="Angles droits, libellé en capitales qui dit ce que fait le bouton. Une seule action rayonne par zone ; le focus clavier est un contour plein de 3 px, décalé du contrôle."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button">{localize("Ajouter une étape")}</Button>
            <Button type="button" variant="secondary">
              {localize("Modifier")} </Button>
            <Button type="button" variant="outline">
              <RotateCw aria-hidden="true" />
              {localize("Réessayer")} </Button>
            <Button type="button" variant="ghost">
              {localize("Annuler")} </Button>
            <Button type="button" variant="destructive">
              {localize("Supprimer l'étape")} </Button>
            <Button type="button" disabled>
              {localize("Indisponible")} </Button>
            <Button type="button" variant="link">
              {localize("Voir la source")} </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl<DemoView>
              label={localize("Vue de la carte (exemple)")}
              value={view}
              onValueChange={setView}
              options={[
                { value: 'global', label: 'Vue globale', icon: <Globe aria-hidden="true" /> },
                { value: 'region', label: 'Jezero', icon: <MapPinned aria-hidden="true" /> },
              ]}
            />
            <p className="text-sm text-muted-foreground">{localize("La case active est pleine, rayonne et porte une coche.")}</p>
          </div>
        </Section>

        <Section
          title={localize("Provenance")}
          intro="À placer au plus près d'une valeur. Le mot, l'icône et le style de bordure distinguent les quatre statuts."
        >
          <div className="flex flex-wrap items-center gap-2">
            <ProvenanceBadge status="measured" />
            <ProvenanceBadge status="calculated" />
            <ProvenanceBadge status="simulated" />
            <ProvenanceBadge status="unknown" />
            <Badge variant="secondary">{localize("Étiquette neutre")}</Badge>
          </div>
        </Section>

        <Section
          title={localize("États des données")}
          intro="Toute zone qui dépend de données affiche l'un de ces quatre états plutôt qu'un vide, avec son voyant. Une erreur dit ce qui a échoué et comment en sortir."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <DataState kind="loading" announce={false} title={localize("Chargement des étapes")}>
              <div className="mt-2 grid w-full gap-2">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-3/5" />
              </div>
            </DataState>
            <DataState
              kind="error"
              announce={false}
              title={localize("La carte n'a pas pu être chargée")}
              description={localize("Le catalogue de données est inaccessible. Vérifiez la connexion, puis réessayez.")}
              action={
                <Button type="button" variant="outline" size="sm">
                  <RotateCw aria-hidden="true" />
                  {localize("Réessayer")} </Button>
              }
            />
            <DataState
              kind="empty"
              title={localize("Aucune étape")}
              description={localize("La mission ne contient encore aucune étape. Elles s'afficheront ici dans l'ordre de visite.")}
            />
            <DataState
              kind="insufficient-coverage"
              title={localize("Pas d'étapes hors du secteur détaillé")}
              description={localize("La vue globale sert à s'orienter. La planification détaillée n'est proposée que dans le secteur de Jezero.")}
              action={
                <Button type="button" size="sm">
                  {localize("Ouvrir Jezero")} </Button>
              }
            />
          </div>
        </Section>

        <Section
          title={localize("Panneaux de mission")}
          intro="Sur l'écran de planification, ces panneaux flottent sur la carte et se replient par leur bandeau pour la dégager. Ils reçoivent des valeurs déjà calculées et mises en forme : ils n'effectuent aucun calcul de mission."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title={localize("Étapes")} description={localize("Dans l'ordre de visite")} headingLevel={3} collapsible>
              <StepList label={localize("Étapes de la mission (exemple)")}>
                <StepListItem kind="camp" title={localize("Camp")} description={localize("Point de départ fictif")} />
                <StepListItem
                  position={1}
                  title={localize("Skinner Ridge")}
                  description={localize("Observation, 30 min")}
                  selected={selectedStep === 'skinner'}
                  onSelect={() => setSelectedStep('skinner')}
                />
                <StepListItem
                  position={2}
                  title={localize("Wildcat Ridge")}
                  description={localize("Prélèvement, 45 min")}
                  selected={selectedStep === 'wildcat'}
                  onSelect={() => setSelectedStep('wildcat')}
                />
                <StepListItem
                  position={3}
                  title={localize("Amalik")}
                  description={localize("Photo, 15 min")}
                  selected={selectedStep === 'amalik'}
                  onSelect={() => setSelectedStep('amalik')}
                />
                <StepListItem kind="return" title={localize("Retour au camp")} description={localize("Inclus une seule fois dans le budget")} />
              </StepList>
            </Panel>

            <Panel title={localize("Budget respecté")} description={localize("Valeurs d'exemple")} headingLevel={3}>
              <BudgetBreakdown
                role="group"
                aria-label={localize("Exemple de budget respecté")}
                availableLabel="Durée disponible"
                availableValue="240 min"
                lines={budgetLines}
                marginLabel="Marge"
                margin={{ value: '36 min', status: 'within', message: localize("Budget respecté") }}
              />
            </Panel>

            <Panel title={localize("Budget dépassé")} description={localize("Valeurs d'exemple")} headingLevel={3}>
              <BudgetBreakdown
                role="group"
                aria-label={localize("Exemple de budget dépassé")}
                availableLabel="Durée disponible"
                availableValue="240 min"
                lines={overBudgetLines}
                marginLabel="Marge"
                margin={{ value: '−24 min', status: 'over', message: localize("Dépassement du budget") }}
              />
            </Panel>
          </div>

          <Panel title={localize("Fiche de site")} description={localize("Structure d'une fiche, contenu fictif")} headingLevel={3}>
            <DataList className="gap-5 sm:grid-cols-2">
              <DataListItem label={localize("Type de roche")} annotation={<ProvenanceBadge status="measured" />}>
                {localize("Valeur issue d'une source citée.")} </DataListItem>
              <DataListItem label={localize("Durée de l'activité")} annotation={<ProvenanceBadge status="simulated" />}>
                {localize("Hypothèse du scénario, réglable.")} </DataListItem>
              <DataListItem label={localize("Distance depuis le camp")} annotation={<ProvenanceBadge status="calculated" />}>
                {localize("Résultat du moteur de mission.")} </DataListItem>
              <DataListItem label={localize("Praticabilité à pied")} annotation={<ProvenanceBadge status="unknown" />}>
                {localize("Non connue : aucune donnée ne permet de l'établir.")} </DataListItem>
            </DataList>
          </Panel>
        </Section>

        <Section
          title={localize("Mouvement")}
          intro="Un seul moment orchestré : à l'ouverture, les instruments se mettent sous tension l'un après l'autre et leur filet d'horizon se trace. Ensuite, rien ne bouge sans raison : un balayage signale un chargement, une transition répond à un geste. Tout s'efface si le système demande moins d'animations."
        >
          <div>
            <Button type="button" variant="outline" onClick={() => setBootCount((count) => count + 1)}>
              <Power aria-hidden="true" />
              {localize("Rejouer la mise sous tension")} </Button>
          </div>
          {/* La clé remonte les panneaux : leur animation d'entrée repart. */}
          <div key={bootCount} className="grid gap-4 sm:grid-cols-3">
            {bootPanels.map((panel) => (
              <Panel key={panel.title} title={panel.title} headingLevel={3} className={`power-on ${panel.delay}`}>
                <div className="grid gap-2">
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3.5 w-3/5" />
                </div>
              </Panel>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
