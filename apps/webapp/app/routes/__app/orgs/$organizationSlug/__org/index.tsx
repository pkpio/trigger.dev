import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { Link } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import invariant from "tiny-invariant";
import { ApiLogoIcon } from "~/components/code/ApiLogoIcon";
import CreateNewWorkflow, {
  CreateNewWorkflowNoWorkflows,
} from "~/components/CreateNewWorkflow";
import { OctoKitty } from "~/components/GitHubLoginButton";
import { Container } from "~/components/layout/Container";
import { List } from "~/components/layout/List";
import { Body } from "~/components/primitives/text/Body";
import {
  Header1,
  Header2,
  Header3,
} from "~/components/primitives/text/Headers";
import { runStatusLabel, runStatusTitle } from "~/components/runs/runStatus";
import { triggerTypeIcon } from "~/components/triggers/triggerTypes";
import { useCurrentOrganization } from "~/hooks/useOrganizations";
import type { WorkflowListItem } from "~/models/workflowListPresenter.server";
import { WorkflowListPresenter } from "~/models/workflowListPresenter.server";
import { requireUserId } from "~/services/session.server";
import { formatDateTime } from "~/utils";

export const loader = async ({ request, params }: LoaderArgs) => {
  await requireUserId(request);
  invariant(params.organizationSlug, "Organization slug is required");

  const presenter = new WorkflowListPresenter();

  try {
    const workflows = await presenter.data(params.organizationSlug);
    return typedjson({ workflows });
  } catch (error: any) {
    console.error(error);
    throw new Response("Error ", { status: 400 });
  }
};

export default function Page() {
  const { workflows } = useTypedLoaderData<typeof loader>();
  const currentOrganization = useCurrentOrganization();
  if (currentOrganization === undefined) {
    return <></>;
  }

  return (
    <Container>
      <Header1 className="mb-6">Workflows</Header1>
      {workflows.length === 0 ? (
        <CreateNewWorkflowNoWorkflows />
      ) : (
        <>
          <Header2 size="small" className="mb-2 text-slate-400">
            {workflows.length} active workflow{workflows.length > 1 ? "s" : ""}
          </Header2>
          <WorkflowList
            workflows={workflows}
            currentOrganizationSlug={currentOrganization.slug}
          />
          <CreateNewWorkflow />
        </>
      )}
    </Container>
  );
}

function WorkflowList({
  workflows,
  currentOrganizationSlug,
}: {
  workflows: WorkflowListItem[];
  currentOrganizationSlug: string;
}) {
  return (
    <List>
      {workflows.map((workflow) => {
        return (
          <li key={workflow.id}>
            <Link
              to={`/orgs/${currentOrganizationSlug}/workflows/${workflow.slug}`}
              className="block hover:bg-slate-850/40 transition"
            >
              <div className="flex justify-between items-center flex-wrap lg:flex-nowrap px-4 py-4">
                <div className="flex items-center flex-1 justify-between">
                  <div className="flex">
                    <TriggerTypeIcon workflow={workflow} />
                    <div className="mr-1 truncate">
                      <Header2 size="large" className="truncate text-slate-200">
                        {workflow.title}
                      </Header2>
                      <div className="flex gap-2 mt-2">
                        <PillLabel label={workflow.trigger.typeTitle} />
                        <Header3
                          size="small"
                          className="truncate text-slate-300"
                        >
                          {workflow.trigger.title}
                        </Header3>
                      </div>
                      <div className="flex flex-wrap gap-x-2 mt-2 items-baseline">
                        {workflow.trigger.properties &&
                          workflow.trigger.properties.map((property) => (
                            <WorkflowProperty
                              key={property.key}
                              label={property.key}
                              content={`${property.value}`}
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                  <ChevronRightIcon
                    className="shrink-0 h-5 w-5 ml-5 text-slate-400 lg:hidden"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex items-center flex-grow lg:flex-grow-0">
                  <div className="flex flex-wrap-reverse justify-between w-full lg:justify-end gap-3 items-center mt-4 lg:mt-0">
                    <div className="flex flex-col text-right">
                      <Body size="extra-small" className="text-slate-500">
                        Last run: {lastRunDescription(workflow.lastRun)}
                      </Body>
                      <Body size="extra-small" className="text-slate-500">
                        {workflow.slug}
                      </Body>
                    </div>
                    <div className="flex gap-2 items-center">
                      {workflow.integrations.source && (
                        <ApiLogoIcon
                          integration={workflow.integrations.source}
                        />
                      )}
                      {workflow.integrations.services.map((service) => {
                        if (service === undefined) {
                          return null;
                        }
                        return (
                          <ApiLogoIcon
                            key={service.slug}
                            integration={service}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <ChevronRightIcon
                    className="shrink-0 h-5 w-5 ml-5 text-slate-400 hidden lg:block"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </List>
  );
}

function lastRunDescription(lastRun: WorkflowListItem["lastRun"]) {
  if (lastRun === undefined) {
    return "Never";
  }
  if (lastRun.status === "SUCCESS") {
    if (lastRun.finishedAt) {
      return formatDateTime(lastRun.finishedAt);
    }
    throw new Error("lastRun.finishedAt is undefined");
  }
  return runStatusLabel(lastRun.status);
}

function PillLabel({ label }: { label: string }) {
  return (
    <span className="px-2 py-1.5 text-xs font-semibold tracking-wider uppercase rounded text-slate-400 bg-slate-700">
      {label}
    </span>
  );
}

function WorkflowProperty({
  label,
  content,
  className,
}: {
  label: string;
  content: string;
  className?: string;
}) {
  return (
    <div className="flex items-baseline gap-x-1">
      <Body size="extra-small" className="uppercase text-slate-400">
        {label}
      </Body>
      <Body size="small" className="text-slate-400 truncate">
        {content}
      </Body>
    </div>
  );
}

function TriggerTypeIcon({ workflow }: { workflow: WorkflowListItem }) {
  if (workflow.integrations.source) {
    return (
      <ApiLogoIcon
        integration={workflow.integrations.source}
        className="p-3 bg-slate-850 rounded-md flex-shrink-0 self-start h-24 w-24 mr-4"
      />
    );
  }

  return triggerTypeIcon(
    workflow.trigger.type,
    "p-3 bg-slate-850 rounded-md flex-shrink-0 self-start h-24 w-24 mr-4"
  );
}
