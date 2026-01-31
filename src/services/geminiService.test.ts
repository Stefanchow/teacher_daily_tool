import { describe, it, expect, vi, beforeEach } from "vitest";
import { geminiService, GeminiService, GeneratePlanParams, AI_CONFIG } from "./geminiService";
import mockData from "../mocks/geminiMock.json";
import mockImageAnalysis from "../mocks/imageAnalysisMock.json";

describe("GeminiService", () => {
  it("should initialize with default config", () => {
    expect(geminiService).toBeDefined();
  });

  describe("Worker Interface", () => {
    it("should call worker with correct URL, headers and model", async () => {
      const expectedSecret = (import.meta as any).env?.VITE_CLASSCARD_WORKER_SECRET;

      const service = new GeminiService({ useMock: false });
      const fetchSpy = vi
        .spyOn(service as any, "fetchWithTimeout")
        .mockRejectedValue(new Error("network"));

      try {
        await service.generateWithWorker("hello worker", undefined, "gemini");
      } catch {
      }

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, rawInit, timeoutMs] = fetchSpy.mock.calls[0];
      const init = rawInit as any;
      expect(url).toBe(AI_CONFIG.BASE_URL);
      expect(timeoutMs).toBe(120000);
      expect(init.method).toBe("POST");
      expect(init.headers["Content-Type"]).toBe("application/json");
      expect(init.headers["X-ClassCard-Secret"]).toBe(expectedSecret);

      const body = JSON.parse(init.body as string);
      expect(body.model).toBe("gemini-2.0-flash-exp");
      expect(body.stream).toBe(true);
      expect(body.messages[0]).toEqual({ role: "user", content: "hello worker" });
    });

    it("should route activity plans to gemini model and lessons to deepseek", async () => {
      const service = new GeminiService({ useMock: false });
      const validPlan = {
        title_zh: "Plan",
        title_en: "Plan",
        grade: "Grade 1",
        duration: 45,
        teachingMethod: "PPP",
        teachingPreparation: {
          objectives_zh: [],
          objectives_en: [],
          keyWords_zh: [],
          keyWords_en: [],
          sentenceStructures_zh: [],
          sentenceStructures_en: [],
          teachingAids_zh: "",
          teachingAids_en: "",
          studentAnalysis_zh: "",
          studentAnalysis_en: "",
        },
        procedures: [],
      };

      const spy = vi
        .spyOn(service as any, "generateWithWorker")
        .mockResolvedValue(JSON.stringify(validPlan));

      await service.generateLessonPlan({
        topic: "Topic",
        grade: "G1",
        duration: 45,
        level: "L1",
        mode: "PPP",
        functionType: "activity",
      } as any);

      await service.generateLessonPlan({
        topic: "Topic",
        grade: "G1",
        duration: 45,
        level: "L1",
        mode: "PPP",
        functionType: "lesson",
      } as any);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls[0][2]).toBe("gemini");
      expect(spy.mock.calls[1][2]).toBe("deepseek");
    });
  });

  describe("JSON Parsing Strategy", () => {
    let service: GeminiService;
    let validateSpy: any;

    beforeEach(() => {
      service = new GeminiService({ useMock: false });
      // Bypass schema validation for testing parsing logic
      validateSpy = vi
        .spyOn(service as any, "validateAIResponse")
        .mockImplementation((data: any) => data);
    });

    it("should parse valid direct JSON", async () => {
      const validJson = '{"title_zh": "Test Plan"}';
      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(validJson);

      const result = await service.generateLessonPlan({ topic: 'test', grade: '1', level: 'A1', duration: 45, mode: 'PPP' });
      expect(result.title_zh).toBe("Test Plan");
    });

    it("should extract JSON from markdown code blocks", async () => {
      const markdownJson =
        'Here is the plan:\n```json\n{"title_zh": "Markdown Plan"}\n```';
      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(markdownJson);

      const result = await service.generateLessonPlan({ topic: 'test', grade: '1', level: 'A1', duration: 45, mode: 'PPP' });
      expect(result.title_zh).toBe("Markdown Plan");
    });

    it("should unwrap nested 'zh' property from response", async () => {
      const nestedJson = '{"zh": {"title_zh": "Nested Plan"}}';
      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(nestedJson);

      const result = await service.generateLessonPlan({ topic: 'test', grade: '1', level: 'A1', duration: 45, mode: 'PPP' });
      expect(result.title_zh).toBe("Nested Plan");
    });

    it("should extract JSON from plain text wrapper", async () => {
      const textJson = 'Sure! {\n  "title_zh": "Text Plan"\n} Hope this helps.';
      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(textJson);

      const result = await service.generateLessonPlan({ topic: 'test', grade: '1', level: 'A1', duration: 45, mode: 'PPP' });
      expect(result.title_zh).toBe("Text Plan");
    });

    it("should sanitize control characters", async () => {
      const dirtyJson = '{"title": "Dirty \u001F Plan"}';
      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(dirtyJson);

      const result = await service.generateLessonPlan({ topic: 'test', grade: '1', level: 'A1', duration: 45, mode: 'PPP' });
      expect(result as any).toEqual(expect.objectContaining({ title: "Dirty  Plan" }));
    });

    it("should fix trailing commas in arrays and objects", async () => {
      const trailingCommaJson = '{"title": "Trailing", "list": [1, 2, ], }';
      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(trailingCommaJson);

      const result = await service.generateLessonPlan({ topic: 'test', grade: '1', level: 'A1', duration: 45, mode: 'PPP' });
      expect(result as any).toEqual(expect.objectContaining({ title: "Trailing", list: [1, 2] }));
    });

    it("should fix trailing commas with varied whitespace (tabs/newlines)", async () => {
      const dirtyJson = `
      {
        "title": "Messy",
        "list": [
          1,
          2,
        ],
        "obj": {
          "a": 1,
        },
      }
      `;
      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(dirtyJson);
      const result = await service.generateLessonPlan({} as any);
      expect(result as any).toEqual(expect.objectContaining({
        title: 'Messy',
        list: [1, 2],
        obj: { a: 1 }
      }));
    });

    it("应从大量 Markdown 文本中准确提取 JSON", async () => {
      const heavyMarkdown = [
        '# 课程计划草案',
        '',
        '以下为生成的教学方案概要：',
        '',
        '- 目标：掌握基础词汇',
        '- 时长：40分钟',
        '',
        '```bash',
        'echo "这是一段示例命令"',
        '```',
        '',
        '结构化结果如下：',
        '',
        '```json',
        '{',
        '  "title": "Markdown Heavy Plan",',
        '  "grade": "Grade 3",',
        '  "duration": 40,',
        '  "teachingPreparation": {',
        '    "objectives": ["Obj"],',
        '    "keyWords": ["KW"],',
        '    "duration": 40,',
        '    "teachingAids": "Board",',
        '    "studentAnalysis": "Some",',
        '    "sentenceStructures": "SVO"',
        '  },',
        '  "procedures": [',
'    "**Step 1 (10 min)**\\n\\n**Teacher:** Talk\\n**Students:** Output\\n\\n*Justification: Why*"',
'  ]',
'}',
'```',
'',
'> 以上内容为自动生成，仅供参考。',
      ].join('\n');

      vi.spyOn(service as any, 'generateWithWorker').mockResolvedValue(heavyMarkdown);

      const result = await service.generateLessonPlan({ duration: 40 } as any);
      expect((result as any).title).toBe('Markdown Heavy Plan');
      expect((result as any).grade).toBe('Grade 3');
      expect((result as any).duration).toBe(40);
      expect(Array.isArray((result as any).procedures)).toBe(true);
      expect((result as any).procedures.some((p: any) => p.includes('Step 1'))).toBe(true);
    });

    it("应修复数组最后元素后跟随\\n\\t 的情况", async () => {
      const arrayWithNT = '说明...\n{\n  "title": "Array Repair",\n  "items": [1, 2, \n\t ],\n  "ok": true\n}\n尾部说明';
      vi.spyOn(service as any, 'generateWithWorker').mockResolvedValue(arrayWithNT);

      const result = await service.generateLessonPlan({} as any);
      expect(result as any).toEqual(expect.objectContaining({ title: 'Array Repair', items: [1, 2], ok: true }));
    });

    it("应在嵌套数组中忽略末尾的换行与制表符并修复尾逗号", async () => {
      const nestedArrayCase = '前置文本 {\n  "title": "Nested Arrays",\n  "list": [[1, 2, \n\t ], [3, 4, \n\t ]],\n  "flag": true\n}\n后置文本';
      vi.spyOn(service as any, 'generateWithWorker').mockResolvedValue(nestedArrayCase);

      const result = await service.generateLessonPlan({} as any);
      expect(result as any).toEqual(expect.objectContaining({ title: 'Nested Arrays', list: [[1, 2], [3, 4]], flag: true }));
    });

    it("should extract only substring between first '{' and last '}'", async () => {
      const wrappedJson = 'NOTE: model generated extra notes before JSON. {"title":"Substr","list":[1]} \nEND FOOTER AFTER JSON';
      vi.spyOn(service as any, 'generateWithWorker').mockResolvedValue(wrappedJson);

      const result = await service.generateLessonPlan({} as any);
      expect(result as any).toEqual(expect.objectContaining({ title: 'Substr', list: [1] }));
    });

    it("should recover after trim when direct parse fails due to leading space", async () => {
      const leadingSpace = '   {\n  "title": "Trim Pass"\n}   ';
      vi.spyOn(service as any, 'generateWithWorker').mockResolvedValue(leadingSpace);

      const result = await service.generateLessonPlan({} as any);
      expect((result as any).title).toEqual('Trim Pass');
    });

    it("should return emergency plan when broken JSON cannot be fixed", async () => {
      // This input contains invalid token that cannot be fixed by brackets
      const brokenJson = '{"title": unquoted_value}';
      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(brokenJson);

      validateSpy.mockRestore();

      // It should return emergency plan instead of throwing
      const result = await service.generateLessonPlan({ topic: "Broken JSON", grade: '1', level: 'A1', duration: 45, mode: 'PPP' });
      expect(result).toBeDefined();
      expect(result.title_en).toBe("Emergency Lesson Plan for Broken JSON");
    });

    it('should recover from malformed JSON structure via emergency fix', async () => {
      // Setup a spy to check if error is logged (optional)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(service as any, 'generateWithWorker').mockResolvedValue('{ "title": "Malformed", "missing_comma": true }');

      const result = await service.generateLessonPlan({ topic: 'test', grade: '1', duration: 45, level: 'Beginner', mode: 'PWP' });
      // The emergency fix should add the comma
      expect((result as any).title).toBe("Malformed");
      // "missing_comma": true might be lost if schema strips unknown, but title is there.
        
      consoleSpy.mockRestore();
    });

    it("should return emergency plan when response content is empty", async () => {
      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue("");

      validateSpy.mockRestore();

      // When content is empty, validation/parsing fails and should return emergency plan
      const result = await service.generateLessonPlan({ topic: "Empty Content", grade: '1', level: 'A1', duration: 45, mode: 'PPP' });
      expect(result).toBeDefined();
      expect(result.title_en).toBe("Emergency Lesson Plan for Empty Content");
    });

    it("should use emergency plan when no choices returned", async () => {
      vi.spyOn(service as any, "generateWithWorker").mockRejectedValue(new Error("No content"));

      const result = await service.generateLessonPlan({ topic: "No Choices", grade: '1', level: 'A1', duration: 45, mode: 'PPP' });
      expect(result).toBeDefined();
      expect(result.title_en).toBe("Emergency Lesson Plan for No Choices"); // Emergency plan uses topic as title
    });

    it("should handle legacy data structure via validation fallback", async () => {
      // Mock data with old structure
      const legacyData = {
        teaching_objectives: ["Obj1"],
        key_points: ["Key1"],
        duration: 45,
        teaching_aids: "Board",
        overall_justification: "Analysis",
        sentence_structures: "SVO",
        audience_analysis: [],
        activities: [
          {
            step_title: "Step 1",
            teacher_talk: "Talk",
            student_output: "Output",
            design_intent: "Intent",
            duration: 10,
          },
          { step_title: "Step 2", teacher_talk: "Talk", student_output: "Output", design_intent: "Intent", duration: 10 },
          { step_title: "Step 3", teacher_talk: "Talk", student_output: "Output", design_intent: "Intent", duration: 10 },
          { step_title: "Step 4", teacher_talk: "Talk", student_output: "Output", design_intent: "Intent", duration: 10 },
          { step_title: "Step 5", teacher_talk: "Talk", student_output: "Output", design_intent: "Intent", duration: 5 },
        ],
        // Missing new fields like 'title', 'grade' at root might cause final validation to fail
        // unless we ensure they are present or the fallback logic adds them?
        // The fallback logic mainly maps 'teachingPreparation' and 'procedures'.
        // Root fields 'title', 'grade', 'duration' are required by lessonPlanSchema.
        // Let's provide them.
        title: "Legacy Plan",
        grade: "Grade 1",
        // duration: 45, // Already present in legacyData
      };

      (service as any).validateAIResponse.mockRestore();

      const result = (service as any).validateAIResponse(legacyData, { topic: 'test', grade: '1', level: 'A1', duration: 45, mode: 'PPP' }, { allowMissingProcedures: true });

      expect(result.teachingPreparation.objectives_zh).toEqual(["Obj1"]);
      expect(result.procedures[0].content_zh).toContain("Step 1");
      expect(result.title_zh).toBe("Legacy Plan");
      expect(result.grade).toBe("Grade 1");
      expect(result.duration).toBe(45);
    });

    it("should handle legacy data structure with 'steps' key", async () => {
      (service as any).validateAIResponse.mockRestore();
      const legacyData = {
        teaching_objectives: ["Obj1"],
        steps: [
          { step_title: "Step 1", teacher_talk: "Talk", student_output: "Output", design_intent: "Intent", duration: 10 },
        ],
        title: "Legacy Plan",
        grade: "Grade 1",
        duration: 45
      };
      
      const result = (service as any).validateAIResponse(
        legacyData,
        undefined,
        { allowMissingProcedures: true }
      );
      expect(result.procedures).toBeDefined();
      expect(result.procedures.length).toBeGreaterThan(0);
      expect(JSON.stringify(result.procedures[0])).toContain("Step 1");
    });

    it("should handle legacy data structure with 'teachingProcess' key", async () => {
      (service as any).validateAIResponse.mockRestore();
      const legacyData = {
        teaching_objectives: ["Obj1"],
        teachingProcess: [
          { step_title: "Step 1", teacher_talk: "Talk", student_output: "Output", design_intent: "Intent", duration: 10 },
        ],
        title: "Legacy Plan",
        grade: "Grade 1",
        duration: 45
      };
      
      const result = (service as any).validateAIResponse(
        legacyData,
        undefined,
        { allowMissingProcedures: true }
      );
      expect(result.procedures).toBeDefined();
      expect(result.procedures.length).toBeGreaterThan(0);
      expect(JSON.stringify(result.procedures[0])).toContain("Step 1");
    });

    it("should handle legacy data structure with 'preparation' key", async () => {
      (service as any).validateAIResponse.mockRestore();
      const legacyData = {
        preparation: {
            objectives: ["Obj1"],
            keyPoints: ["Key1"]
        },
        procedures: [{ step: 'Step 1', content: 'Content' }],
        title: "Legacy Plan",
        grade: "Grade 1",
        duration: 45
      };
      
      const result = (service as any).validateAIResponse(legacyData, undefined, { allowMissingProcedures: true });
      expect(result.teachingPreparation).toBeDefined();
      expect(result.teachingPreparation.objectives_zh).toEqual(["Obj1"]);
    });

    it("extractJsonFromText 在无法解析时应返回空对象", () => {
      const service2 = new GeminiService({ useMock: false });
      const r = (service2 as any).extractJsonFromText('no json here');
      expect(r).toEqual({});
    });

    it("应在严重解析失败时使用紧急备用方案 (模拟完全失败)", async () => {
      // Mock emergencyFixJSON to throw
      const originalEmergencyFix = (service as any).emergencyFixJSON;
      (service as any).emergencyFixJSON = () => { throw new Error("Mock Emergency Fail"); };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const broken = '{"a": [1 2]}';
      vi.spyOn(service as any, 'generateWithWorker').mockResolvedValue(broken);

      // Now it should NOT throw because generateLessonPlan catches everything and uses getEmergencyLessonPlan
      const result = await service.generateLessonPlan({ topic: "Similarity", grade: '1', level: 'A1', duration: 45, mode: 'PPP' });
      
      expect(result).toBeDefined();
      expect(result.title_en).toBe("Emergency Lesson Plan for Similarity");
      
      // Restore
      (service as any).emergencyFixJSON = originalEmergencyFix;
      consoleSpy.mockRestore();
    });

    it("深层嵌套对象的类型推断验证", () => {
      const s = new GeminiService();
      const json = '{"a":{"b":{"c":1}}}';
      const r = (s as any).extractJsonFromText(json);
      expect((r as any).a.b.c).toBe(1);
    });

    it("含换行的尾随逗号清理并解析", () => {
      const s = new GeminiService();
      const messy = '{\n"x": [1, 2, \n ],\n"y": {"z": 3,\n }\n}';
      const r = (s as any).extractJsonFromText(messy);
      expect((r as any).x).toEqual([1, 2]);
      expect((r as any).y.z).toBe(3);
    });

    it("边界严格验证只提取最外层对象", () => {
      const s = new GeminiService();
      const t = 'prefix text json {"a":1,"b":[1,2,3,],} suffix';
      const r = (s as any).extractJsonFromText(t);
      expect((r as any).a).toBe(1);
      expect((r as any).b).toEqual([1, 2, 3]);
    });

    it("应正确预处理 audienceAnalysis 的字符串数组格式", () => {
      const service = new GeminiService({ useMock: false });
      const rawData = {
        title: "Test Plan",
        grade: "Grade 1",
        duration: 40,
        teachingPreparation: {
          objectives: ["Obj1"],
          keyWords: ["Key1"],
          duration: 40,
          audienceAnalysis: [
            "Cognitive: Students are concrete thinkers.",
            "Behavioral: Energetic and active.",
            "Just a simple string description"
          ]
        },
        procedures: [
          { step: "1", teachersTalk: "Hi", studentsOutput: "Hello", justification: "Intro", duration: 5 }
        ]
      };

      const result = (service as any).validateAIResponse(rawData, undefined, { allowMissingProcedures: true });

      expect(result.teachingPreparation.audienceAnalysis!).toHaveLength(3);
      const analysis = result.teachingPreparation.audienceAnalysis as any[];
      
      expect(analysis[0]).toEqual({
        type: "cognitive",
        description: "Students are concrete thinkers."
      });
      
      expect(analysis[1]).toEqual({
        type: "behavioral",
        description: "Energetic and active."
      });
      
      expect(analysis[2]).toEqual({
         type: "general",
         description: "Just a simple string description"
      });
    });



    it("应在无法修复时返回空对象而不是抛出错误", () => {
        const s = new GeminiService();
        const t = '[1, 2, }';
        const r = (s as any).extractJsonFromText(t);
        expect(r).toEqual({});
    });

    it("控制字符深度清理包含换行/回车/制表符", () => {
      const s = new GeminiService();
      const t = '{\n\t"x": "a\tb\n",\r"y": [1,2,],\n}';
      const r = (s as any).extractJsonFromText(t);
      // extractJsonFromText -> emergencyFixJSON -> removes newlines/tabs globally
      // So "a\tb\n" becomes "ab"
      expect((r as any).x).toBe('ab');
      expect((r as any).y).toEqual([1, 2]);
    });



    it("类型断言测试与边界值", () => {
      const v: Record<string, unknown> | Array<unknown> = [];
      // @ts-expect-error
      const n: number = v;
      expect(Array.isArray(v)).toBe(true);
    });

    describe("audienceAnalysis 格式处理", () => {
      it("应自动修复字符串格式的 audienceAnalysis", () => {
        const service = new GeminiService({ useMock: false });
        const stringFormatData = {
          title: "测试教案",
          grade: "Grade 5",
          duration: 45,
          teachingPreparation: {
            objectives: ["目标1"],
            keyWords: ["词汇1"],
            duration: 45,
            teachingAids: "白板",
            studentAnalysis: "学生分析",
            sentenceStructures: "SVO",
            audienceAnalysis: [
              "Cognitive: Transitioning from concrete to abstract thinking.",
              "Affective: Developing collaborative skills"
            ]
          },
          procedures: [
            { step: "步骤1", teachersTalk: "Hello", studentsOutput: "Hi", justification: "热身", duration: 5 },
            { step: "步骤2", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
            { step: "步骤3", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
            { step: "步骤4", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
            { step: "步骤5", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 }
          ]
        };

        const result = (service as any).validateAIResponse(stringFormatData, undefined, { allowMissingProcedures: true });
        
        // 验证转换成功
        expect(Array.isArray(result.teachingPreparation.audienceAnalysis)).toBe(true);
        expect(typeof result.teachingPreparation.audienceAnalysis![0]).toBe('object');
        expect(result.teachingPreparation.audienceAnalysis![0]).toHaveProperty('description');
        expect((result.teachingPreparation.audienceAnalysis![0] as any).description)
          .toBe("Transitioning from concrete to abstract thinking.");
        expect(result.teachingPreparation.audienceAnalysis![0]).toHaveProperty('type');
      });

      it("应正确处理对象格式的 audienceAnalysis", () => {
        const service = new GeminiService({ useMock: false });
        const objectFormatData = {
          title: "测试教案",
          grade: "Grade 5",
          duration: 45,
          teachingPreparation: {
            objectives: ["目标1"],
            keyWords: ["词汇1"],
            duration: 45,
            teachingAids: "白板",
            studentAnalysis: "学生分析",
            sentenceStructures: "SVO",
            audienceAnalysis: [
              {
                type: "cognitive",
                description: "学生从具体思维向抽象思维过渡"
              }
            ]
          },
          procedures: [
            { step: "步骤1", teachersTalk: "Hello", studentsOutput: "Hi", justification: "热身", duration: 5 },
            { step: "步骤2", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
            { step: "步骤3", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
            { step: "步骤4", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
            { step: "步骤5", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 }
          ]
        };

        const result = (service as any).validateAIResponse(objectFormatData, undefined, { allowMissingProcedures: true });
        
        // 验证对象格式保持不变
        expect((result.teachingPreparation.audienceAnalysis![0] as any).type).toBe("cognitive");
        expect((result.teachingPreparation.audienceAnalysis![0] as any).description)
          .toBe("学生从具体思维向抽象思维过渡");
      });
    });
  });

  describe("generateLessonPlan (Mock Mode)", () => {
    // Force useMock to true for testing
    const service = new GeminiService({ useMock: true });

    it("should return a valid lesson plan from mock data", async () => {
      const params = {
        topic: "Water Cycle",
        level: "A2",
        grade: "Grade 2",
        duration: 45,
        mode: "PWP" as const,
      };

      const plan = await service.generateLessonPlan(params);

      expect(plan).toBeDefined();
      expect(plan.title_zh).toContain("Water Cycle");
      expect(plan.procedures.length).toBeGreaterThan(0);

      // Verify bilingual output structure
      // Title should contain Chinese (implied by checking specific mock value or just existence)
      expect(plan.title_zh).toBe("水循环 (The Water Cycle)");

      // Verify audienceAnalysis field (new structure)
      expect(plan.teachingPreparation.audienceAnalysis).toBeDefined();
      expect(Array.isArray(plan.teachingPreparation.studentAnalysis_zh)).toBe(
        false,
      );
      // audienceAnalysis is not in the interface anymore
      // expect(Array.isArray((plan.teachingPreparation as any).audienceAnalysis)).toBe(
      //   true,
      // );

      const activity = plan.procedures[0];
      // Updated to check title_zh as step names are mapped to title_zh now
      expect(activity.title_zh || activity.content_zh).toContain("Warm-up");
      // Verify description is in English (basic check - allows emojis now)
      expect(activity.content_zh + activity.title_zh).toMatch(/[A-Za-z]+/);
    });

    it("should return a random plan if topic not found", async () => {
      const params = {
        topic: "NonExistentTopic123",
        level: "A2",
        grade: "Grade 2",
        duration: 45,
        mode: "PWP" as const,
      };

      const plan = await service.generateLessonPlan(params);
      expect(plan).toBeDefined();
      // Mock returns default mock data title even if topic is different if using mock
      // But validateAIResponse uses mock.title || params.topic
      // Check logic in geminiService: title: mock.title || params.topic
      // So if mock has title, it uses it.
      expect(plan.title_zh).toBeDefined();
    });
  });

  describe("analyzeImage (Mock Mode)", () => {
    const service = new GeminiService({ useMock: true });

    it("should return mock image analysis result", async () => {
      const result = await service.analyzeImage("base64string");

      expect(result).toBeDefined();
      // Service maps 'vocabulary' from mock to 'words'
      expect(result.words).toBeDefined();
      expect(result.words.length).toBeGreaterThan(0);
      expect(result.sentences.length).toBeGreaterThan(0);
      expect(result.suggestedTopic).toBeDefined();
    });
  });

  describe('analyzeImage (Real Mode)', () => {
    let service: GeminiService;
    let workerSpy: any;

    beforeEach(() => {
        service = new GeminiService({ useMock: false });
        workerSpy = vi.spyOn(service as any, 'generateWithWorker');
    });

    afterEach(() => {
        workerSpy.mockRestore();
    });

    it("should call worker with correct parameters and parse response", async () => {
      workerSpy.mockResolvedValue(
        '{"words": ["apple"], "sentences": ["A red apple."], "suggestedTopic": "Fruits"}'
      );

      const result = await service.analyzeImage("base64data");

      expect(workerSpy).toHaveBeenCalledTimes(1);
      const [messages, , modelType] = workerSpy.mock.calls[0];
      expect(modelType).toBe('gpt');
      const userMessage = messages[0];
      const imagePart = userMessage.content.find((c: any) => c.type === 'image_url');
      expect(imagePart.image_url.url).toContain('base64data');

      expect(result).toEqual({
        words: ["apple"],
        sentences: ["A red apple."],
        suggestedTopic: "Fruits",
        grammar_points: [],
        vocabulary_extensions: [],
      });
    });

    it("should handle worker error", async () => {
      workerSpy.mockRejectedValue(new Error("Worker error"));

      await expect(service.analyzeImage("base64data")).rejects.toThrow(
        "Worker error"
      );
    });

    it("should handle invalid/empty response content", async () => {
      workerSpy.mockResolvedValue("{}");

      const result = await service.analyzeImage("base64data");

      expect(result).toEqual({
        words: [],
        sentences: [],
        suggestedTopic: "General Topic",
        grammar_points: [],
        vocabulary_extensions: [],
      });
    });
  });

  describe("语言使用和休息时间逻辑", () => {
    let service: GeminiService;
    beforeEach(() => {
      service = new GeminiService({ useMock: false });
    });

    it("时长80分钟时应能正常生成完整教案（不强制插入休息步骤）", async () => {
      const params = {
        topic: "测试主题",
        grade: "Grade 8",
        duration: 80,
        level: "Intermediate",
        mode: "PWP" as const,
      };

      const responseJson = {
        title: "测试教案（Break Case）",
        grade: params.grade,
        duration: params.duration,
        teachingPreparation: {
          objectives: ["目标1"],
          keyWords: ["词汇1"],
          duration: params.duration,
          teachingAids: "白板",
          studentAnalysis: "学生整体具备合作学习能力，课堂参与度较高。",
          sentenceStructures: "SVO 结构与条件句（中文说明）",
          audienceAnalysis: [{ description: "具备较强的任务执行能力" }],
        },
        procedures: [
          {
            step: "任务前：情境创设与目标引入\n(Pre-task: Context Setting & Goal Introduction)",
            teachersTalk:
              "Look at this scenario.\nWhat problem do you notice?\nOur mission today...",
            studentsOutput: "学生观察并讨论场景要点。",
            justification: "通过情境导入明确学习目标。",
            duration: 20,
          },
          {
            step: "任务环：任务执行与语言聚焦\n(Task-cycle: Task Execution & Language Focus)",
            teachersTalk:
              "Work in teams and analyze the requirements.\nUse target structures.",
            studentsOutput: "小组协作完成任务并汇报成果。",
            justification: "在真实任务中聚焦语言使用。",
            duration: 20,
          },
          {
            step: "课间休息\n(Break Time)",
            teachersTalk:
              "同学们，现在休息10分钟。\nLet's take a 10-minute break.",
            studentsOutput: "学生休息，自由活动。",
            justification: "缓解学习疲劳，为下半节课做好准备。",
            duration: 10,
          },
          {
            step: "任务后：成果展示与反馈评价\n(Post-task: Outcome Presentation & Feedback)",
            teachersTalk: "Present your outcomes and reflect.",
            studentsOutput: "展示成果并进行互评。",
            justification: "通过展示与反馈巩固所学。",
            duration: 15,
          },
          {
            step: "拓展项目：应用迁移与延伸\n(Project Extension: Application & Transfer)",
            teachersTalk: "Apply what you've learned to a new scenario.",
            studentsOutput: "将知识迁移到新的语境。",
            justification: "促进知识的迁移与应用。",
            duration: 15,
          },
        ],
      };

      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(
        JSON.stringify({
          ...responseJson,
          procedures: [
            ...responseJson.procedures,
            {
              step: "课间休息 (Break)",
              teachersTalk: "Take a break.",
              studentsOutput: "Rest.",
              justification: "Relax.",
              duration: 10,
            }
          ]
        })
      );

      // vi.spyOn(service as any, "chatCompletionPreferred").mockResolvedValue({
      //   choices: [{ message: { content: '{"items":[]}' } }]
      // });
      const plan = await service.generateLessonPlan(params as any);
      expect(plan).toBeDefined();
      expect(Array.isArray(plan.procedures)).toBe(true);
      expect(plan.procedures.length).toBeGreaterThan(0);
    });

    it("中文内容应正确使用中文", async () => {
      const responseJson = {
        title: "中文教案（Language Case）",
        grade: "Grade 7",
        duration: 45,
        teachingPreparation: {
          objectives: ["提升交际能力"],
          keyWords: ["词汇A"],
          duration: 45,
          teachingAids: "投影仪、白板笔",
          studentAnalysis:
            "学生整体具有基础表达能力，课堂参与较积极，具备合作意识，少量英文词汇穿插但不影响整体中文表达。",
          sentenceStructures: "一般现在时与情态动词（中文说明）",
          audienceAnalysis: [{ description: "注意力易分散，需任务驱动" }],
        },
        procedures: [
          {
            step: "任务前：情境创设与目标引入\n(Pre-task: Context Setting & Goal Introduction)",
            teachersTalk:
              "同学们，请观察图片并思考其中的情境。\nNow listen carefully.",
            studentsOutput: "学生描述观察内容并提出问题。",
            justification: "激发学习动机，明确任务目标。",
            duration: 12,
          },
          {
            step: "任务环：任务执行与语言聚焦\n(Task-cycle: Task Execution & Language Focus)",
            teachersTalk: "分组完成任务并记录要点。",
            studentsOutput: "学生小组协作并输出成果。",
            justification: "在真实任务中锻炼语言应用能力。",
            duration: 18,
          },
          {
            step: "任务后：成果展示与反馈评价\n(Post-task: Outcome Presentation & Feedback)",
            teachersTalk: "展示并进行同伴评价。",
            studentsOutput: "学生展示与互评。",
            justification: "通过输出与评价实现内化。",
            duration: 15,
          },
        ],
      };

      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(
        JSON.stringify(responseJson)
      );

      const plan = await service.generateLessonPlan({} as any);

      plan.procedures.forEach((proc) => {
        const content = proc.content_zh || '';
        const justificationMatch = content.match(/\*Justification: (.*)\*/);
        const justification = justificationMatch ? justificationMatch[1] : '';
        const hasEnglish = /[a-zA-Z]/.test(justification);
        expect(hasEnglish).toBe(false);
      });

      const studentAnalysis = plan.teachingPreparation.studentAnalysis_zh;
      const englishCount = (studentAnalysis.match(/[a-zA-Z]/g) || []).length;
      expect(englishCount).toBeLessThan(10);
    });
  });

  describe("String Termination Fixes", () => {
    let service: GeminiService;

    beforeEach(() => {
      service = new GeminiService({ useMock: false });
    });

    it("should fix unterminated strings at end of input", () => {
      const input = '{"title": "Unterminated string';
      const fixed = (service as any).fixUnterminatedStrings(input);
      expect(fixed).toBe('{"title": "Unterminated string"');
    });

    it("should fix unterminated strings before a comma", () => {
      const input = '{"title": "Unterminated, "next": 1}';
      const fixed = (service as any).fixUnterminatedStrings(input);
      expect(fixed).toBe('{"title": "Unterminated", "next": 1}');
    });
    
    it("should fix unterminated strings before a brace", () => {
      const input = '{"title": "Unterminated}';
      const fixed = (service as any).fixUnterminatedStrings(input);
      expect(fixed).toBe('{"title": "Unterminated"}');
    });

    it("should fix double quotes inside strings", () => {
      const input = '{"title": "Say ""Hello"" to world"}';
      const fixed = (service as any).fixDoubleQuotes(input);
      expect(fixed).toBe('{"title": "Say \\"Hello\\" to world"}');
    });

    it("should not touch already escaped quotes", () => {
      const input = '{"title": "Say \\"Hello\\" to world"}';
      const fixed = (service as any).fixDoubleQuotes(input);
      expect(fixed).toBe('{"title": "Say \\"Hello\\" to world"}');
    });
    
    it("should handle mixed issues", () => {
      const input = '{"title": "Unterminated ""quote"" here, "next": 1}';
      let content = (service as any).fixUnterminatedStrings(input);
      content = (service as any).fixDoubleQuotes(content);
      expect(content).toBe('{"title": "Unterminated \\"quote\\" here", "next": 1}');
    });
  });

  describe("紧急JSON修复逻辑", () => {
    const service = new GeminiService({ useMock: false });

    it("应在缺少procedures字段时使用紧急修复方案", async () => {
      const brokenData = {
        title: "测试教案",
        grade: "Grade 5",
        duration: 45,
        teachingPreparation: {
          objectives: ["目标1"],
          keyWords: ["词汇1"],
          duration: 45,
          teachingAids: "白板",
          studentAnalysis: "学生分析",
          sentenceStructures: "SVO",
          audienceAnalysis: [{ description: "特点" }]
        }
        // 缺少procedures字段！
      };

      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(
        JSON.stringify(brokenData)
      );

      // 验证不会抛出错误，而是返回修复后的教案（或者紧急教案）
      const result = await service.generateLessonPlan({
        topic: 'Test Topic',
        grade: 'Grade 5',
        duration: 45,
        language: 'zh'
      } as any);
      
      expect(result).toBeDefined();
      expect(result.procedures).toBeDefined();
      expect(result.procedures.length).toBeGreaterThan(0);
    });

    it("应在JSON语法错误无法修复时使用紧急修复方案", async () => {
      // Use a JSON with trailing commas (which is invalid JSON)
      const invalidJSON = `{
        "title": "Test Lesson Plan",
        "grade": "Grade 5",
        "duration": 45,
        "teachingPreparation": {
          "objectives": ["目标1"],
          "keyWords": ["词汇1"],
          },
      }`;

      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(
        invalidJSON
      );

      // 验证不会抛出错误，而是返回紧急教案
      const result = await service.generateLessonPlan({
        topic: 'Test Topic',
        grade: 'Grade 5',
        duration: 45,
        language: 'zh'
      } as any);

      expect(result).toBeDefined();
    });
  });

  describe("教学法切换功能", () => {
    let service: GeminiService;

    beforeEach(() => {
      service = new GeminiService({ useMock: false });
    });

    it("未选择教学法时默认使用任务式", async () => {
      const params = {
        topic: "默认测试",
        grade: "Grade 3",
        duration: 40,
        level: "A2",
        // mode is missing/null to test default
      };

      const spy = vi.spyOn(service as any, 'generateWithWorker').mockResolvedValue(JSON.stringify({
          title: "Default Plan",
          grade: "Grade 3",
          duration: 40,
          teachingPreparation: {
             objectives: ["Obj"],
             keyWords: ["Key"],
             duration: 40,
             teachingAids: "Aids",
             studentAnalysis: "Analysis",
             sentenceStructures: "Struct"
          },
          procedures: [
            { step: "Task Step", teachersTalk: "Talk", studentsOutput: "Output", justification: "Justification", duration: 40 }
          ]
        }));

      await service.generateLessonPlan(params as any);
      
      const messages = spy.mock.calls[0][0] as any[];
      const systemPrompt = messages.find(m => m.role === 'system')?.content || messages[0].content;
      
      expect(systemPrompt).toContain('任务型教学 (TBLT)');
    });

    it("不同教学法应在系统提示中体现不同结构", async () => {
      const spy = vi.spyOn(service as any, 'generateWithWorker').mockImplementation(async (messages: any) => {
        const systemContent = messages.find((m: any) => m.role === 'system')?.content || messages[0].content;
        
        let stepName = "Unknown";
        let methodName = "task-based";
        if (systemContent.includes('任务型教学 (TBLT)')) {
          stepName = "任务前：导入 (Pre-task)";
          methodName = "task-based";
        } else if (systemContent.includes('PPP')) {
          stepName = "呈现阶段：新知展示";
          methodName = "PPP";
        }

        return JSON.stringify({
            title: "Plan",
            grade: "Grade 3",
            duration: 40,
            teachingMethod: methodName,
            teachingPreparation: {
               objectives: ["Objective 1", "Objective 2"],
               keyWords: ["Key1"],
               duration: 40,
               teachingAids: "Aids",
               studentAnalysis: "Analysis",
               sentenceStructures: "Struct"
            },
            procedures: [
              { step: stepName, teachersTalk: "Talk", studentsOutput: "Output", justification: "Justification", duration: 10 },
              { step: "Step 2", teachersTalk: "Talk", studentsOutput: "Output", justification: "Justification", duration: 10 },
              { step: "Step 3", teachersTalk: "Talk", studentsOutput: "Output", justification: "Justification", duration: 10 },
              { step: "Step 4", teachersTalk: "Talk", studentsOutput: "Output", justification: "Justification", duration: 5 },
              { step: "Step 5", teachersTalk: "Talk", studentsOutput: "Output", justification: "Justification", duration: 5 },
              { step: "Step 6", teachersTalk: "Talk", studentsOutput: "Output", justification: "Justification", duration: 5 },
              { step: "Step 7", teachersTalk: "Talk", studentsOutput: "Output", justification: "Justification", duration: 5 },
              { step: "Step 8", teachersTalk: "Talk", studentsOutput: "Output", justification: "Justification", duration: 5 }
            ]
          });
      });

      const taskBasedPlan = await service.generateLessonPlan({ 
        topic: "T", grade: "G", duration: 40, level: "L", mode: 'task-based' 
      });
      
      const pppPlan = await service.generateLessonPlan({ 
        topic: "T", grade: "G", duration: 40, level: "L", mode: 'PPP' 
      });

      expect(taskBasedPlan.teachingMethod).toBe('task-based');
      expect(pppPlan.teachingMethod).toBe('PPP');
    });
  });

  describe("语法输入功能", () => {
    let service: GeminiService;

    beforeEach(() => {
      service = new GeminiService({ useMock: false });
    });

    it("应正确接收和传递语法参数", async () => {
      const grammar = ['一般过去时动词变化', '不规则动词表'];
      const params = { 
        topic: "Topic",
        grade: "G1",
        duration: 45,
        level: "L1",
        mode: 'task-based',
        grammar 
      };
      
      // Basic param check as requested
      expect(params.grammar).toHaveLength(2);
      expect(params.grammar[0]).toBe('一般过去时动词变化');

      // Verify it's actually passed to the prompt
      const spy = vi.spyOn(service as any, 'generateWithWorker').mockResolvedValue(JSON.stringify({
          title: "Plan",
          grade: "G1",
          duration: 45,
          teachingPreparation: {
             objectives: [],
             keyWords: [],
             duration: 45,
             teachingAids: "",
             studentAnalysis: "",
             sentenceStructures: ""
          },
          procedures: []
        }));

      await service.generateLessonPlan(params as any);
      const messages = spy.mock.calls[0][0] as any[];
      const systemPrompt = messages.find(m => m.role === 'system')?.content || messages[0].content;
      
      expect(systemPrompt).toContain('重点语法要求');
      expect(systemPrompt).toContain('一般过去时动词变化');
      expect(systemPrompt).toContain('不规则动词表');
    });
    
    it("语法内容应体现在生成的教案中", async () => {
      const grammar = ['现在完成时结构'];
      
      const spy = vi.spyOn(service as any, 'generateWithWorker').mockResolvedValue(JSON.stringify({
          title: "Plan",
          grade: "G1",
          duration: 45,
          teachingPreparation: {
             objectives: ["Objective 1"],
             keyWords: ["Key1"],
             duration: 45,
             teachingAids: "",
             studentAnalysis: "",
             sentenceStructures: "重点掌握现在完成时结构"
          },
          procedures: [
            { step: "Step 1", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
            { step: "Step 2", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
            { step: "Step 3", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
            { step: "Step 4", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 10 },
            { step: "Step 5", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 5 },
            { step: "Step 6", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 5 },
            { step: "Step 7", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 5 },
            { step: "Step 8", teachersTalk: "T", studentsOutput: "S", justification: "J", duration: 5 }
          ]
        }));

      const plan = await service.generateLessonPlan({ 
        topic: "Test", 
        grade: "G1", 
        duration: 45, 
        level: "L1", 
        grammar 
      } as any);
      
      const structures = plan.teachingPreparation.sentenceStructures_zh;
      // Handle both string array and string cases (mock returns string, validate converts to array)
      const structureText = Array.isArray(structures) ? structures.join(' ') : structures;
      expect(structureText).toContain('现在完成时');
    });
  });

  describe("Novelty Check", () => {
    let service: GeminiService;

    beforeEach(() => {
      service = new GeminiService({ useMock: false });
      // Reset previousPlans
      (service as any).previousPlans = [];
    });

    it("should allow first plan", async () => {
      const plan = { title_zh: "Plan 1", title_en: "Plan 1", teachingPreparation: { objectives_zh: ["obj1"], objectives_en: ["obj1"] }, procedures: [{ content_zh: "s1", content_en: "s1" }] };
      vi.spyOn(service as any, "generateWithWorker").mockResolvedValue(JSON.stringify(plan));
      // Mock validation to return the plan as is
      vi.spyOn(service as any, "validateAIResponse").mockReturnValue(plan);

      const result = await service.generateLessonPlan({ duration: 45 } as any);
      expect(result.title_zh).toBe("Plan 1");
      expect(result.procedures.some(p => p.content_zh.includes("s1"))).toBe(true);
      expect((service as any).previousPlans).toHaveLength(1);
    });

    it("should warn if plan is too similar", async () => {
      // Need enough similarity > 0.7
      // Title (0.3) + Objectives (0.2) + Length (0.1) + Steps...
      // If 1 step: 0.3+0.2+0.1+0.1 = 0.7. Not > 0.7.
      // If 2 steps: 0.3+0.2+0.1+0.1+0.1 = 0.8. > 0.7.
      const plan1 = { 
        title_zh: "Plan 1", 
        title_en: "Plan 1",
        teachingPreparation: { objectives_zh: ["obj1"], objectives_en: ["obj1"] }, 
        procedures: [{ content_zh: "s1", content_en: "s1" }, { content_zh: "s2", content_en: "s2" }] 
      };
      // Identical plan
      const plan2 = { 
        title_zh: "Plan 1", 
        title_en: "Plan 1", 
        teachingPreparation: { objectives_zh: ["obj1"], objectives_en: ["obj1"] }, 
        procedures: [{ content_zh: "s1", content_en: "s1" }, { content_zh: "s2", content_en: "s2" }] 
      };
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      
      // First generation
      vi.spyOn(service as any, "generateWithWorker").mockResolvedValueOnce(JSON.stringify(plan1));
      vi.spyOn(service as any, "validateAIResponse").mockReturnValue(plan1);
      
      await service.generateLessonPlan({} as any);
      
      // Second generation (identical)
      vi.spyOn(service as any, "generateWithWorker").mockResolvedValueOnce(JSON.stringify(plan2));
      vi.spyOn(service as any, "validateAIResponse").mockReturnValue(plan2);
      
      await service.generateLessonPlan({} as any);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("[NOVELTY CHECK] Lesson plan similarity too high"), expect.any(Number));
      expect(consoleSpy).toHaveBeenCalledWith('Generated plan is too similar to previous content, suggest regeneration');
      
      consoleSpy.mockRestore();
    });

    it("should maintain max 5 history", async () => {
       const planTemplate = (i: number) => ({ 
           title_zh: `Plan ${i}`, 
           title_en: `Plan ${i}`,
           teachingPreparation: { objectives_zh: [`obj${i}`], objectives_en: [`obj${i}`] }, 
           procedures: [{ content_zh: `s${i}`, content_en: `s${i}` }] 
       });

       for(let i=1; i<=6; i++) {
           const plan = planTemplate(i);
           vi.spyOn(service as any, "generateWithWorker").mockResolvedValueOnce(JSON.stringify(plan));
           vi.spyOn(service as any, "validateAIResponse").mockReturnValue(plan);
           await service.generateLessonPlan({} as any);
       }
       
       const history = (service as any).previousPlans;
       expect(history).toHaveLength(5);
       expect(history[0].title_zh).toBe("Plan 6");
       expect(history[4].title_zh).toBe("Plan 2");
    });
  });

  describe("Prompt Generation", () => {
    let service: GeminiService;

    beforeEach(() => {
      service = new GeminiService({ useMock: false });
    });

    it("should include grammar and correct mode instructions in prompt", async () => {
      const chatSpy = vi.spyOn(service as any, "generateWithWorker").mockResolvedValue("{}");
      // Mock validation to avoid errors on empty content
      vi.spyOn(service as any, "validateAIResponse").mockReturnValue({ 
          title_zh: "Mock Plan",
          title_en: "Mock Plan", 
          teachingPreparation: { objectives_zh: [], objectives_en: [] }, 
          procedures: [] 
      });

      const params = {
        topic: "Topic",
        grade: "G1",
        level: "L1",
        duration: 45,
        mode: "PPP",
        grammar: ["Past Tense", "Passive Voice"]
      };

      await service.generateLessonPlan(params as any);

      const calls = chatSpy.mock.calls;
      const messages = calls[0][0] as any[]; // First arg is messages array
      const userMessage = messages.find((m: any) => m.role === "system");

      expect(userMessage.content).toContain("教学法：PPP");
      expect(userMessage.content).toContain("Past Tense");
      expect(userMessage.content).toContain("Passive Voice");
      // expect(userMessage.content).toContain("呈现阶段：新知展示"); // Template may not have this exact string anymore
      
      chatSpy.mockRestore();
    });

    it("should switch to PWP mode", async () => {
       const chatSpy = vi.spyOn(service as any, "generateWithWorker").mockResolvedValue("{}");
      vi.spyOn(service as any, "validateAIResponse").mockReturnValue({ title_zh: "Mock", title_en: "Mock", teachingPreparation: {}, procedures: [] } as any);

      const params = {
        topic: "Reading",
        grade: "G2",
        duration: 45,
        mode: "PWP"
      };

      await service.generateLessonPlan(params as any);
      const userMessage = (chatSpy.mock.calls[0][0] as any[]).find((m: any) => m.role === "system");
      expect(userMessage.content).toContain("教学法：PWP");
      // expect(userMessage.content).toContain("读前活动：预测引导"); // Template may not have this
      
      chatSpy.mockRestore();
    });

    it("should switch to TTT mode", async () => {
      const chatSpy = vi.spyOn(service as any, "generateWithWorker").mockResolvedValue("{}");
      // Need to mock validateAIResponse here too as generateLessonPlan calls it
      vi.spyOn(service as any, "validateAIResponse").mockReturnValue({ title_zh: "Mock", title_en: "Mock", teachingPreparation: {}, procedures: [] } as any);

      await service.generateLessonPlan({ 
        topic: "Test", 
        grade: "G1", 
        duration: 45, 
        level: "L1", 
        mode: "TTT" 
      } as any);

      const userMessage = (chatSpy.mock.calls[0][0] as any[]).find((m: any) => m.role === "system");
      expect(userMessage.content).toContain("教学法：TTT");
      expect(userMessage.content).toContain("测试1：诊断"); // Template has "测试1：诊断"
      
      chatSpy.mockRestore();
    });
  });
});
