# BP6 – Moteur de recherche avancé

Cette démonstration fournit un moteur de recherche client riche pour explorer un
ensemble de données tabulaires. Elle illustre les fonctionnalités demandées :

- **Filtrage par colonne** grâce à un sélecteur multi-colonnes (avec option
  « Toutes les colonnes »).
- **Expressions régulières** avec validation et messages d'erreur détaillés.
- **Recherche multi-critères** (ET/OU) via des lignes dynamiques.
- **Recherche approximative (fuzzy)** configurable avec un seuil de distance.

## Démarrage

Ouvrez `index.html` dans un navigateur moderne. Les données d'exemple sont
chargées depuis `data/sample-data.json`. Aucune dépendance externe n'est
requise.

## Fonctionnalités

### Sélection de colonnes

- Cochez « Toutes les colonnes » pour activer l'ensemble des colonnes.
- Décochez individuellement les colonnes que vous ne souhaitez pas analyser.
- Le moteur inspecte uniquement les colonnes cochées et désactive
  automatiquement les options non disponibles dans les critères.

### Critères de recherche

- Ajoutez un critère avec le bouton « Ajouter un critère ».
- Chaque critère possède :
  - un sélecteur de colonne (ou « Toutes »),
  - un opérateur (`Contient`, `Commence par`, `Finit par`, `Égal`, `Différent`,
    `Regex`),
  - un champ de saisie,
  - une case pour activer la lecture Regex.
- Les erreurs de Regex sont affichées clairement sous la ligne correspondante.

### Jointures ET / OU

Sélectionnez `ET` ou `OU` pour combiner les différents critères.

### Recherche fuzzy

- Activez « Recherche floue » pour autoriser une distance de Levenshtein entre 0
  et 2.
- Ajustez le seuil avec le slider.
- Si « Correspondance exacte » est cochée, la recherche fuzzy est ignorée
  automatiquement.

### Données de démonstration

Le fichier `data/sample-data.json` contient un petit jeu de données de profils
professionnels. Adaptez-le à vos besoins ou remplacez-le par vos propres
ressources.

## Améliorations possibles

- Persistance des critères via `localStorage`.
- Export des résultats au format CSV.
- Chargement d'un fichier CSV externe via l'API File.
