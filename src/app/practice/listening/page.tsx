const QUESTION_TYPES = [
  'Multiple Choice',
  'Matching',
  'Plan/Map/Diagram Labelling',
  'Form Completion',
  'Note Completion',
  'Table Completion',
  'Flow-Chart Completion',
  'Summary Completion',
  'Sentence Completion',
  'Short Answer Questions',
];

export default function ListeningTypesPage() {
  return (
    <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {QUESTION_TYPES.map((type) => (
        <a
          key={type}
          href={`/practice/listening/${encodeURIComponent(type)}`}
          className="border rounded-lg p-6 hover:shadow-md transition"
        >
          <h3 className="font-medium">{type}</h3>
          <p className="text-sm text-gray-500">10 Tasks</p>
        </a>
      ))}
    </div>
  );
}