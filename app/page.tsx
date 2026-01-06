import fs from 'fs';
import path from 'path';
import BookEditor from '@/components/BookEditor';

export default async function Home() {
  // Read the JSON file from the parent directory
  // Note: logic assumes running locally or build time access
  const dataPath = path.join(process.cwd(), '..', 'book_data.json');
  let initialData = [];

  try {
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    initialData = JSON.parse(fileContent);
  } catch (err) {
    console.error("Could not load book_data.json", err);
  }

  return (
    <main className="min-h-screen">
      <BookEditor initialData={initialData} />
    </main>
  );
}
