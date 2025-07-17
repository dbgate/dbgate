-- >>>
-- autoExecute: true
-- splitterInitialValue: 20%
-- selected-chart: 1
-- <<<

SELECT 
    d.name AS department_name,
    FORMAT(fr.date, 'yyyy-MM') AS month,
    SUM(fr.profit) AS total_monthly_profit
FROM 
    departments d
JOIN 
    employees e ON d.id = e.department_id
JOIN 
    employee_project ep ON e.id = ep.employee_id
JOIN 
    finance_reports fr ON ep.project_id = fr.id
GROUP BY 
    d.name, FORMAT(fr.date, 'yyyy-MM')
ORDER BY 
    d.name, month;

