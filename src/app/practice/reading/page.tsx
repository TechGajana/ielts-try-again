const QUESTION_TYPES = [
  'Multiple Choice',
  'Identifying Information',
  "Identifying Writer's Views",
  'Matching Information',
  'Matching Headings',
  'Matching Features',
  'Matching Sentence Endings',
  'Sentence Completion',
  'Summary/Note/Table/Flow-Chart Completion',
  'Diagram Label Completion',
  'Short Answer Questions',
];

export default function ReadingTypesPage() {
  return (
    <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {QUESTION_TYPES.map((type) => (
        <a
          key={type}
          href={`/practice/reading/${encodeURIComponent(type)}`}
          className="border rounded-lg p-6 hover:shadow-md transition"
        >
          <h3 className="font-medium">{type}</h3>
          <p className="text-sm text-gray-500">10 Tasks</p>
        </a>
      ))}
    </div>
  );
}