// Menu images are accepted only together with a validated menu-item save.
export async function POST() {
  return Response.json(
    { error: 'Save the menu item to upload its image. Reload the form and try again.' },
    { status: 410 }
  );
}
