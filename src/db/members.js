import { performQuery } from ".";

const getMembersQuery = `SELECT
	members.*,
	COALESCE(JSON_AGG(DISTINCT nodes.*) FILTER (WHERE nodes.id IS NOT NULL), '[]') AS nodes
FROM
	members
	LEFT JOIN memberships ON memberships.member_id = members.id
	LEFT JOIN nodes ON nodes.id = memberships.node_id
GROUP BY
	members.id
ORDER BY
	members.id DESC`;

const getMemberQuery = `SELECT
	*
FROM
	members
WHERE
	members.id = $1`;

const getMemberNodesQuery = `SELECT
	nodes.*,
	to_json(buildings) AS building
FROM
	nodes
	JOIN buildings ON nodes.building_id = buildings.id
	JOIN memberships ON memberships.node_id = nodes.id
WHERE
	memberships.member_id = $1
GROUP BY
	nodes.id,
	buildings.id`;

const getMemberRequestsQuery = `SELECT
	requests.*,
	to_json(buildings) AS building
FROM
	requests
	JOIN buildings ON requests.building_id = buildings.id
WHERE
	member_id = $1
GROUP BY
	requests.id,
	buildings.id`;

export async function getMembers() {
  return performQuery(getMembersQuery);
}

export async function getMember(id) {
  if (!Number.isInteger(parseInt(id, 10))) throw new Error("Bad params");

  const [member] = await performQuery(getMemberQuery, [id]);
  if (!member) throw new Error("Not found");

  const nodes = await performQuery(getMemberNodesQuery, [id]);
  const requests = await performQuery(getMemberRequestsQuery, [id]);

  return {
    ...member,
    nodes,
    requests,
  };
}
