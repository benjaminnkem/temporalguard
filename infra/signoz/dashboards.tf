locals {
  trace_window = "timestamp >= fromUnixTimestamp64Nano($start_timestamp_nano) AND timestamp <= fromUnixTimestamp64Nano($end_timestamp_nano) AND serviceName = 'temporalguard-demo'"
  log_window   = "timestamp >= $start_timestamp_nano AND timestamp <= $end_timestamp_nano"

  dashboards = {
    platform_health = {
      title       = "TemporalGuard · Platform Health"
      description = "API, worker, queue, and investigation operating health."
      panels = [
        ["Service spans", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window}", "none", "value"],
        ["Database spans", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name LIKE 'pg.%'", "none", "value"],
        ["Queue jobs processed", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name = 'temporalguard.queue.process'", "none", "value"],
        ["Service activity over time", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} GROUP BY ts ORDER BY ts ASC", "none", "graph"],
        ["TemporalGuard operation mix", "SELECT now() AS ts, replaceOne(name, 'temporalguard.', '') AS operation, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name LIKE 'temporalguard.%' GROUP BY operation ORDER BY value DESC", "none", "bar"],
      ]
    }
    workflow_reliability = {
      title       = "TemporalGuard · Workflow Reliability"
      description = "Workflow starts, completions, deadline misses, and latency."
      panels = [
        ["Workflows started", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_logs.distributed_logs_v2 WHERE ${local.log_window} AND body_v2.message = 'Workflow started'", "none", "value"],
        ["Workflows completed", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_logs.distributed_logs_v2 WHERE ${local.log_window} AND body_v2.message = 'Workflow completed'", "none", "value"],
        ["Workflows overdue", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_logs.distributed_logs_v2 WHERE ${local.log_window} AND body_v2.message = 'Workflow overdue'", "none", "value"],
        ["Workflow activity over time", "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 1 MINUTE) AS ts, body_v2.message AS state, toFloat64(count()) AS value FROM signoz_logs.distributed_logs_v2 WHERE ${local.log_window} AND body_v2.message IN ('Workflow started', 'Workflow completed', 'Workflow overdue') GROUP BY ts, state ORDER BY ts ASC", "none", "graph"],
        ["Workflow outcome mix", "SELECT now() AS ts, replaceOne(body_v2.message, 'Workflow ', '') AS outcome, toFloat64(count()) AS value FROM signoz_logs.distributed_logs_v2 WHERE ${local.log_window} AND body_v2.message IN ('Workflow completed', 'Workflow overdue') GROUP BY outcome ORDER BY value DESC", "none", "pie"],
      ]
    }
    violation_investigation = {
      title       = "TemporalGuard · Violation Investigation"
      description = "Violations and evidence-backed investigation outcomes."
      panels = [
        ["Violations created", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_logs.distributed_logs_v2 WHERE ${local.log_window} AND body_v2.message = 'Violation created'", "none", "value"],
        ["Investigations completed", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name = 'temporalguard.investigation.execute'", "none", "value"],
        ["Evidence queries", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name = 'temporalguard.signoz.query'", "none", "value"],
        ["Investigation duration over time", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS ts, toFloat64(avg(duration_nano) / 1000000) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name = 'temporalguard.investigation.execute' GROUP BY ts ORDER BY ts ASC", "ms", "graph"],
        ["Investigation evidence mix", "SELECT now() AS ts, replaceOne(name, 'temporalguard.', '') AS operation, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name IN ('temporalguard.violation.create', 'temporalguard.investigation.execute', 'temporalguard.signoz.query') GROUP BY operation ORDER BY value DESC", "none", "bar"],
      ]
    }
    event_ingestion = {
      title       = "TemporalGuard · Event Ingestion"
      description = "Accepted and rejected business-event ingestion."
      panels = [
        ["Events received", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_logs.distributed_logs_v2 WHERE ${local.log_window} AND body_v2.message = 'Business event received'", "none", "value"],
        ["Rules matched", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_logs.distributed_logs_v2 WHERE ${local.log_window} AND body_v2.message = 'Rule matched'", "none", "value"],
        ["Ingestion trace spans", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name = 'temporalguard.business_event.receive'", "none", "value"],
        ["Event processing over time", "SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 1 MINUTE) AS ts, body_v2.message AS stage, toFloat64(count()) AS value FROM signoz_logs.distributed_logs_v2 WHERE ${local.log_window} AND body_v2.message IN ('Business event received', 'Rule matched') GROUP BY ts, stage ORDER BY ts ASC", "none", "graph"],
        ["Event-to-rule conversion", "SELECT now() AS ts, body_v2.message AS stage, toFloat64(count()) AS value FROM signoz_logs.distributed_logs_v2 WHERE ${local.log_window} AND body_v2.message IN ('Business event received', 'Rule matched') GROUP BY stage ORDER BY value DESC", "none", "bar"],
      ]
    }
    investigation_agent = {
      title       = "TemporalGuard · Investigation Agent"
      description = "Investigation throughput, failures, and bounded tool activity."
      panels = [
        ["Investigations run", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name = 'temporalguard.investigation.execute'", "none", "value"],
        ["SigNoz evidence queries", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name = 'temporalguard.signoz.query'", "none", "value"],
        ["Average investigation time", "SELECT now() AS ts, toFloat64(avg(duration_nano) / 1000000) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name = 'temporalguard.investigation.execute'", "ms", "value"],
        ["Agent activity over time", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS ts, replaceOne(name, 'temporalguard.', '') AS operation, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name IN ('temporalguard.investigation.execute', 'temporalguard.signoz.query') GROUP BY ts, operation ORDER BY ts ASC", "none", "graph"],
        ["Agent operation mix", "SELECT now() AS ts, replaceOne(name, 'temporalguard.', '') AS operation, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name IN ('temporalguard.investigation.execute', 'temporalguard.signoz.query') GROUP BY operation ORDER BY value DESC", "none", "pie"],
      ]
    }
    telemetry_completeness = {
      title       = "TemporalGuard · Telemetry Completeness"
      description = "Trace, log, metric, and deployment evidence quality."
      panels = [
        ["Trace spans", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window}", "none", "value"],
        ["Structured domain logs", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_logs.distributed_logs_v2 WHERE ${local.log_window} AND body_v2.message IN ('Business event received', 'Rule matched', 'Workflow started', 'Workflow completed', 'Workflow overdue', 'Violation created')", "none", "value"],
        ["Domain spans", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name LIKE 'temporalguard.%'", "none", "value"],
        ["Trace coverage over time", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} GROUP BY ts ORDER BY ts ASC", "none", "graph"],
        ["Domain signal coverage", "SELECT now() AS ts, replaceOne(name, 'temporalguard.', '') AS signal, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name LIKE 'temporalguard.%' GROUP BY signal ORDER BY value DESC", "none", "bar"],
      ]
    }
    deployment_impact = {
      title       = "TemporalGuard · Deployment Impact"
      description = "Workflow reliability and duration by deployed service version."
      panels = [
        ["Workflow completions", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name = 'temporalguard.workflow.complete'", "none", "value"],
        ["Deadline misses", "SELECT now() AS ts, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name = 'temporalguard.workflow.overdue'", "none", "value"],
        ["Average completion time", "SELECT now() AS ts, toFloat64(avg(duration_nano) / 1000000) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name = 'temporalguard.workflow.complete'", "ms", "value"],
        ["Workflow outcomes over time", "SELECT toStartOfInterval(timestamp, INTERVAL 1 MINUTE) AS ts, replaceOne(name, 'temporalguard.workflow.', '') AS outcome, toFloat64(count()) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name IN ('temporalguard.workflow.complete', 'temporalguard.workflow.overdue') GROUP BY ts, outcome ORDER BY ts ASC", "none", "graph"],
        ["Workflow span duration", "SELECT now() AS ts, replaceOne(name, 'temporalguard.workflow.', '') AS operation, toFloat64(avg(duration_nano) / 1000000) AS value FROM signoz_traces.distributed_signoz_index_v3 WHERE ${local.trace_window} AND name IN ('temporalguard.workflow.create', 'temporalguard.workflow.complete', 'temporalguard.workflow.overdue') GROUP BY operation ORDER BY value DESC", "ms", "bar"],
      ]
    }
  }

  dashboard_widgets = {
    for dashboard_key, dashboard in local.dashboards : dashboard_key => [
      for index, panel in dashboard.panels : {
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
        panelTypes            = panel[3]
        query = {
          builder = {
            queryData     = []
            queryFormulas = []
          }
          clickhouse_sql = [{ disabled = false, legend = panel[0], name = "A", query = panel[1] }]
          id             = "${dashboard_key}-${index}-query"
          promql         = [{ disabled = true, legend = "", name = "A", query = "" }]
          queryType      = "clickhouse_sql"
        }
        selectedLogFields    = []
        selectedTracesFields = []
        softMax              = 0
        softMin              = 0
        stackedBarChart      = false
        thresholds           = []
        timePreferance       = "GLOBAL_TIME"
        title                = panel[0]
        yAxisUnit            = panel[2]
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
      h      = index < 3 ? 5 : 10
      i      = widget.id
      moved  = false
      static = false
      w      = index < 3 ? 4 : (index == 3 ? 8 : 4)
      x      = index < 3 ? index * 4 : (index == 3 ? 0 : 8)
      y      = index < 3 ? 0 : 5
    }
  ])
  name             = "temporalguard-${replace(each.key, "_", "-")}"
  tags             = ["temporalguard", "managed-by-terraform"]
  title            = each.value.title
  uploaded_grafana = false
  variables        = ""
  version          = "v5"
  widgets          = jsonencode(local.dashboard_widgets[each.key])
}
