import { NextResponse } from "next/server";
import { getDispatchRequest, listMechanics, updateDispatchRequest, type DispatchStatus } from "@/lib/dispatch";

const statuses = new Set<DispatchStatus>(["new", "reviewed", "assigned", "arrived", "in_progress", "completed", "cancelled", "no_show"]);

export async function PATCH(request: Request, context: RouteContext<"/api/admin/requests/[id]">) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = body.status == null ? undefined : String(body.status) as DispatchStatus;
  const assignedMechanicId = body.assigned_mechanic_id == null || body.assigned_mechanic_id === ""
    ? body.assigned_mechanic_id === null ? null : undefined
    : String(body.assigned_mechanic_id);
  const locationLabel = body.location_label == null ? undefined : String(body.location_label).trim();
  const note = body.note == null ? undefined : String(body.note).trim();

  let current: Awaited<ReturnType<typeof getDispatchRequest>>;
  try {
    current = await getDispatchRequest(id);
  } catch (error) {
    console.error("[admin/requests] Could not load request before update", error);
    return NextResponse.json({ error: "The request could not be loaded." }, { status: 503 });
  }
  if (!current) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (current.status === "cancelled" || current.status === "no_show") {
    return NextResponse.json({ error: "Closed requests cannot be updated." }, { status: 409 });
  }

  if ((status && !statuses.has(status)) || (locationLabel !== undefined && (locationLabel.length < 2 || locationLabel.length > 300)) || (note && note.length > 1000)) {
    return NextResponse.json({ error: "Invalid request update." }, { status: 400 });
  }

  if (assignedMechanicId) {
    const mechanics = await listMechanics();
    if (!mechanics.some((mechanic) => mechanic.id === assignedMechanicId)) {
      return NextResponse.json({ error: "Choose a mechanic from the list." }, { status: 400 });
    }
  }

  if (status === "assigned" || status === "arrived" || status === "in_progress") {
    const nextMechanicId = assignedMechanicId === undefined ? current.assigned_mechanic_id : assignedMechanicId;
    if (!nextMechanicId) return NextResponse.json({ error: "Assign a mechanic before advancing this request." }, { status: 400 });
  }

  try {
    const updated = await updateDispatchRequest(id, {
      status,
      assigned_mechanic_id: assignedMechanicId,
      location_label: locationLabel,
      note,
    });
    if (!updated) return NextResponse.json({ error: "Request not found." }, { status: 404 });
    return NextResponse.json(updated, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/requests] Could not update request", error);
    return NextResponse.json({ error: "The request could not be updated." }, { status: 503 });
  }
}
