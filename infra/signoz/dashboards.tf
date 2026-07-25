locals {
  dashboards = {
    platform_health = {
      title       = "TemporalGuard · Platform Health"
      description = "API, worker, queue, and investigation operating health."
      metrics = [
        ["Queue backlog", "temporalguard.queue.backlog", "sum"],
        ["Investigation failures", "temporalguard.investigation.failures", "sum"],
        ["SigNoz query failures", "temporalguard.signoz.query.failures", "sum"],
      ]
    }
    workflow_reliability = {
      title       = "TemporalGuard · Workflow Reliability"
      description = "Workflow starts, completions, deadline misses, and latency."
      metrics = [
        ["Workflows started", "temporalguard.workflows.started", "sum"],
        ["Workflows completed", "temporalguard.workflows.completed", "sum"],
        ["Workflows overdue", "temporalguard.workflows.overdue", "sum"],
      ]
    }
    violation_investigation = {
      title       = "TemporalGuard · Violation Investigation"
      description = "Violations and evidence-backed investigation outcomes."
      metrics = [
        ["Violations", "temporalguard.violations", "sum"],
        ["Investigations", "temporalguard.investigations", "sum"],
        ["Tool calls", "temporalguard.investigation.tool_calls", "sum"],
      ]
    }
    event_ingestion = {
      title       = "TemporalGuard · Event Ingestion"
      description = "Accepted and rejected business-event ingestion."
      metrics = [
        ["Events ingested", "temporalguard.events.ingested", "sum"],
        ["Ingestion errors", "temporalguard.event.ingestion.errors", "sum"],
        ["Event processing latency", "temporalguard.event.processing.duration", "avg"],
      ]
    }
    investigation_agent = {
      title       = "TemporalGuard · Investigation Agent"
      description = "Investigation throughput, failures, and bounded tool activity."
      metrics = [
        ["Investigations", "temporalguard.investigations", "sum"],
        ["Failures", "temporalguard.investigation.failures", "sum"],
        ["Tool calls", "temporalguard.investigation.tool_calls", "sum"],
      ]
    }
    telemetry_completeness = {
      title       = "TemporalGuard · Telemetry Completeness"
      description = "Trace, log, metric, and deployment evidence quality."
      metrics = [
        ["Quality score", "temporalguard.telemetry.quality", "avg"],
        ["Missing signals", "temporalguard.telemetry.missing_signals", "sum"],
        ["Query failures", "temporalguard.signoz.query.failures", "sum"],
      ]
    }
    deployment_impact = {
      title       = "TemporalGuard · Deployment Impact"
      description = "Workflow reliability and duration by deployed service version."
      metrics = [
        ["Workflow duration", "temporalguard.workflow.duration", "avg"],
        ["Violation rate", "temporalguard.violations", "sum"],
        ["Completions", "temporalguard.workflows.completed", "sum"],
      ]
    }
  }

  dashboard_widgets = {
    for dashboard_key, dashboard in local.dashboards : dashboard_key => [
      for index, metric in dashboard.metrics : {
        bucketCount           = 30
        bucketWidth           = 0
        columnUnits           = {}
        description           = dashboard.description
        fillSpans             = false
        id                    = "${dashboard_key}-${index}"
        isStacked             = false
        mergeAllActiveQueries = false
        nullZeroValues        = "zero"
        opacity               = "1"
        panelTypes            = index == 0 ? "value" : "graph"
        query = {
          builder = {
            queryData = [{
              aggregateAttribute = {
                dataType = "float64"
                id       = "${metric[1]}--float64--Sum--true"
                isColumn = true
                isJSON   = false
                key      = metric[1]
                type     = "Sum"
              }
              aggregateOperator = metric[2]
              dataSource        = "metrics"
              disabled          = false
              expression        = "A"
              filters           = { items = [], op = "AND" }
              functions         = []
              groupBy           = []
              having            = []
              legend            = metric[0]
              limit             = null
              orderBy           = []
              queryName         = "A"
              reduceTo          = metric[2]
              spaceAggregation  = metric[2]
              stepInterval      = 60
              timeAggregation   = metric[2]
            }]
            queryFormulas = []
          }
          clickhouse_sql = [{ disabled = true, legend = "", name = "A", query = "" }]
          id             = "${dashboard_key}-${index}-query"
          promql         = [{ disabled = true, legend = "", name = "A", query = "" }]
          queryType      = "builder"
        }
        selectedLogFields    = []
        selectedTracesFields = []
        softMax              = 0
        softMin              = 0
        stackedBarChart      = false
        thresholds           = []
        timePreferance       = "GLOBAL_TIME"
        title                = metric[0]
        yAxisUnit            = "none"
      }
    ]
  }
}

resource "signoz_dashboard" "temporalguard" {
  for_each = local.dashboards

  collapsable_rows_migrated = true
  description               = each.value.description
  layout = jsonencode([
    for index, widget in local.dashboard_widgets[each.key] : {
      h      = 8
      i      = widget.id
      moved  = false
      static = false
      w      = index == 0 ? 12 : 6
      x      = index == 2 ? 6 : 0
      y      = index == 0 ? 0 : 8
    }
  ])
  name             = "temporalguard-${replace(each.key, "_", "-")}"
  panel_map        = jsonencode({})
  tags             = ["temporalguard", "managed-by-terraform"]
  title            = each.value.title
  uploaded_grafana = false
  variables        = jsonencode({})
  version          = "v4"
  widgets          = jsonencode(local.dashboard_widgets[each.key])
}
