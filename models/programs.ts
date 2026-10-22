export type Program = {
  published?: boolean;
  slug: string; name: string; group: "Công nghệ" | "Sáng tạo" | "Kinh doanh";
  symbol: "code" | "ai" | "shield" | "cloud" | "chip" | "design" | "ux" | "marketing" | "business" | "logistics";
  image: string; tagline: string; description: string; tools: string[]; skills: string[];
  careers: string[]; project: string; stages: { title: string; topics: string[] }[];
};

// Public introduction content. Academic offerings and enrollments remain managed separately.
export const programs: Program[] = [
  {
    slug: "lap-trinh-phan-mem", name: "Lập trình phần mềm", group: "Công nghệ", symbol: "code", image: "/pp-academy-tech-lab.webp",
    tagline: "Từ dòng code đầu tiên đến sản phẩm của riêng bạn.",
    description: "Khám phá cách xây dựng website và ứng dụng, từ tư duy giải quyết vấn đề, thiết kế dữ liệu đến phát triển và kiểm thử một sản phẩm hoàn chỉnh.",
    tools: ["JavaScript", "React", "SQL", "Git"],
    skills: ["Phân tích yêu cầu và thiết kế luồng ứng dụng", "Xây dựng giao diện thích ứng với nhiều thiết bị", "Kết nối API, quản lý dữ liệu và kiểm thử phần mềm"],
    careers: ["Lập trình viên frontend", "Lập trình viên backend", "Kiểm thử viên phần mềm"],
    project: "Xây dựng một ứng dụng quản lý hoặc website thương mại với tài khoản, cơ sở dữ liệu và bản triển khai có thể trải nghiệm.",
    stages: [{title:"Tư duy lập trình",topics:["Thuật toán và cấu trúc dữ liệu cơ bản", "HTML, CSS và JavaScript", "Quản lý mã nguồn với Git"]},{title:"Phát triển ứng dụng",topics:["Giao diện React", "API và cơ sở dữ liệu quan hệ", "Xác thực và phân quyền"]},{title:"Hoàn thiện sản phẩm",topics:["Kiểm thử và xử lý lỗi", "Triển khai ứng dụng", "Dự án nhóm và hồ sơ năng lực"]}],
  },
  {
    slug:"tri-tue-nhan-tao", name:"Trí tuệ nhân tạo & Dữ liệu", group:"Công nghệ",symbol:"ai",image:"/pp-academy-tech-lab.webp",
    tagline:"Biến dữ liệu thành những giải pháp thông minh.",
    description:"Tiếp cận phân tích dữ liệu, học máy và ứng dụng AI qua các bài toán cụ thể. Học cách đánh giá kết quả, hiểu giới hạn mô hình và sử dụng dữ liệu có trách nhiệm.",
    tools:["Python","Pandas","scikit-learn","Jupyter"],skills:["Làm sạch, khám phá và trực quan hóa dữ liệu","Huấn luyện và đánh giá mô hình học máy cơ bản","Tích hợp mô hình hoặc dịch vụ AI vào ứng dụng"],careers:["Chuyên viên phân tích dữ liệu","Lập trình viên ứng dụng AI","Trợ lý kỹ thuật dữ liệu"],project:"Phát triển một bảng phân tích dữ liệu và mô hình dự đoán, kèm báo cáo đánh giá độ chính xác và giới hạn sử dụng.",
    stages:[{title:"Nền tảng dữ liệu",topics:["Python cho phân tích dữ liệu","Thống kê ứng dụng","Làm sạch và trực quan hóa"]},{title:"Mô hình và ứng dụng AI",topics:["Học máy có giám sát","Đánh giá và cải thiện mô hình","AI tạo sinh và thiết kế lời nhắc"]},{title:"Dự án dữ liệu",topics:["Thiết kế quy trình dữ liệu","Tích hợp mô hình vào ứng dụng","Quyền riêng tư và trách nhiệm sử dụng"]}],
  },
  {
    slug:"an-ninh-mang",name:"An ninh mạng",group:"Công nghệ",symbol:"shield",image:"/pp-academy-tech-lab.webp",
    tagline:"Hiểu hệ thống. Nhận diện rủi ro. Bảo vệ kết nối.",description:"Tìm hiểu nền tảng mạng máy tính, hệ điều hành và các nguyên tắc bảo vệ hệ thống. Thực hành phân tích rủi ro và giám sát an toàn trong môi trường phòng lab được cho phép.",tools:["Linux","Wireshark","Firewall","SIEM"],skills:["Cấu hình mạng và phân quyền truy cập","Nhận diện dấu hiệu bất thường từ nhật ký hệ thống","Lập kế hoạch gia cố và ứng phó sự cố"],careers:["Nhân viên giám sát an toàn thông tin","Kỹ thuật viên mạng","Chuyên viên hỗ trợ bảo mật"],project:"Thiết kế một mô hình mạng phòng lab với phân vùng, chính sách truy cập và quy trình theo dõi sự cố.",
    stages:[{title:"Nền tảng hệ thống",topics:["Mạng TCP/IP","Quản trị Linux và Windows","Tài khoản và phân quyền"]},{title:"Bảo vệ và giám sát",topics:["Cấu hình tường lửa","Phân tích log và lưu lượng mạng","An toàn ứng dụng web"]},{title:"Vận hành an toàn",topics:["Đánh giá rủi ro","Quy trình ứng phó sự cố","Báo cáo và thực hành phòng lab"]}],
  },
  {
    slug:"dien-toan-dam-may",name:"Điện toán đám mây & DevOps",group:"Công nghệ",symbol:"cloud",image:"/pp-academy-tech-lab.webp",
    tagline:"Đưa ý tưởng lên cloud. Vận hành một cách tin cậy.",description:"Khám phá hạ tầng đám mây và cách tự động hóa quy trình đưa phần mềm vào vận hành. Kết nối kiến thức hệ thống, container, triển khai và giám sát ứng dụng.",tools:["Docker","Linux","CI/CD","Cloud"],skills:["Đóng gói ứng dụng bằng container","Thiết lập quy trình kiểm tra và triển khai tự động","Theo dõi tài nguyên, sao lưu và kiểm soát chi phí"],careers:["Kỹ thuật viên cloud","Nhân viên vận hành hệ thống","Kỹ sư DevOps tập sự"],project:"Xây dựng pipeline triển khai ứng dụng container, có giám sát, sao lưu và tài liệu vận hành.",
    stages:[{title:"Hạ tầng căn bản",topics:["Linux và mạng","Dịch vụ điện toán đám mây","Quản lý tài nguyên và truy cập"]},{title:"Tự động hóa triển khai",topics:["Container và Docker","Quy trình CI/CD","Cấu hình môi trường ứng dụng"]},{title:"Giám sát và vận hành",topics:["Log, metric và cảnh báo","Sao lưu và phục hồi","Chi phí và độ tin cậy"]}],
  },
  {
    slug:"thiet-ke-vi-mach",name:"Thiết kế vi mạch bán dẫn",group:"Công nghệ",symbol:"chip",image:"/pp-academy-tech-lab.webp",
    tagline:"Khám phá thế giới công nghệ từ những mạch logic nhỏ nhất.",description:"Làm quen với điện tử số, kiến trúc máy tính và quy trình thiết kế mạch logic. Rèn luyện tư duy hệ thống thông qua mô phỏng và kiểm chứng thiết kế.",tools:["Verilog","Logic số","Mô phỏng","FPGA"],skills:["Đọc và xây dựng sơ đồ logic số","Mô tả phần cứng và viết testbench","Phân tích kết quả mô phỏng và tài liệu thiết kế"],careers:["Kỹ thuật viên điện tử số","Nhân sự kiểm chứng vi mạch tập sự","Trợ lý thiết kế phần cứng"],project:"Thiết kế một khối xử lý logic đơn giản, viết bộ kiểm thử và trình bày kết quả mô phỏng.",
    stages:[{title:"Điện tử và logic",topics:["Hệ đếm và đại số Boolean","Mạch tổ hợp và tuần tự","Nền tảng kiến trúc máy tính"]},{title:"Mô tả phần cứng",topics:["Ngôn ngữ Verilog","Thiết kế khối logic","Testbench và mô phỏng"]},{title:"Kiểm chứng thiết kế",topics:["Phân tích thời gian","Kiểm tra chức năng","Dự án và tài liệu kỹ thuật"]}],
  },
  {
    slug:"thiet-ke-do-hoa",name:"Thiết kế đồ họa & Đa phương tiện",group:"Sáng tạo",symbol:"design",image:"/pp-academy-library.webp",
    tagline:"Biến góc nhìn riêng thành ngôn ngữ hình ảnh.",description:"Phát triển tư duy thị giác, kỹ năng thiết kế và kể chuyện bằng hình ảnh. Khám phá nhận diện thương hiệu, ấn phẩm số và nội dung chuyển động để xây dựng portfolio cá nhân.",tools:["Illustrator","Photoshop","Figma","Motion"],skills:["Vận dụng bố cục, màu sắc và typography","Thiết kế bộ nhận diện và ấn phẩm truyền thông","Biên tập hình ảnh và phát triển portfolio"],careers:["Nhà thiết kế đồ họa","Nhà thiết kế nội dung số","Biên tập hình ảnh"],project:"Xây dựng bộ nhận diện cho một thương hiệu giả định, gồm logo, ấn phẩm và hướng dẫn sử dụng hình ảnh.",
    stages:[{title:"Tư duy thị giác",topics:["Bố cục và màu sắc","Typography","Phác thảo và phát triển ý tưởng"]},{title:"Công cụ và sản phẩm",topics:["Đồ họa vector và xử lý ảnh","Nhận diện thương hiệu","Nội dung số và chuyển động"]},{title:"Portfolio cá nhân",topics:["Quy trình nhận brief","Dự án thương hiệu","Trình bày và phản biện thiết kế"]}],
  },
  {
    slug:"thiet-ke-ui-ux",name:"Thiết kế trải nghiệm UI/UX",group:"Sáng tạo",symbol:"ux",image:"/pp-academy-library.webp",
    tagline:"Thiết kế trải nghiệm bắt đầu từ việc thấu hiểu con người.",description:"Tìm hiểu quy trình thiết kế sản phẩm số từ nghiên cứu người dùng đến prototype. Kết hợp tính dễ sử dụng, cấu trúc thông tin và thẩm mỹ trong từng màn hình.",tools:["Figma","Wireframe","Prototype","Design System"],skills:["Nghiên cứu nhu cầu và xây dựng hành trình người dùng","Thiết kế wireframe và prototype tương tác","Kiểm tra tính dễ sử dụng và bàn giao cho lập trình viên"],careers:["UI Designer","UX Designer tập sự","Nhà thiết kế sản phẩm số"],project:"Thiết kế một ứng dụng từ khảo sát nhu cầu, luồng tác vụ đến prototype và báo cáo thử nghiệm người dùng.",
    stages:[{title:"Hiểu người dùng",topics:["Phỏng vấn và quan sát","Hành trình người dùng","Cấu trúc thông tin"]},{title:"Thiết kế giao diện",topics:["Wireframe và layout","Thành phần giao diện","Prototype tương tác"]},{title:"Đánh giá trải nghiệm",topics:["Thử nghiệm tính dễ sử dụng","Khả năng tiếp cận","Case study và bàn giao"]}],
  },
  {
    slug:"digital-marketing",name:"Digital Marketing",group:"Kinh doanh",symbol:"marketing",image:"/pp-academy-campus.webp",
    tagline:"Kết nối thương hiệu với đúng người, bằng đúng thông điệp.",description:"Khám phá cách xây dựng nội dung, lựa chọn kênh truyền thông và đánh giá hiệu quả một chiến dịch số. Tiếp cận marketing bằng sự kết hợp giữa sáng tạo và phân tích dữ liệu.",tools:["Content","SEO","Social Media","Analytics"],skills:["Xây dựng chân dung khách hàng và kế hoạch nội dung","Tối ưu nội dung cho tìm kiếm và mạng xã hội","Đọc chỉ số và đề xuất cải thiện chiến dịch"],careers:["Chuyên viên nội dung","Nhân viên digital marketing","Chuyên viên truyền thông mạng xã hội"],project:"Lập kế hoạch chiến dịch cho một thương hiệu giả định, với nội dung mẫu, dự toán và phương pháp đo lường.",
    stages:[{title:"Nền tảng marketing",topics:["Hành vi khách hàng","Định vị và thông điệp","Nghiên cứu thị trường"]},{title:"Kênh và nội dung",topics:["Viết nội dung số","SEO và social media","Nguyên tắc quảng cáo trực tuyến"]},{title:"Chiến dịch và đo lường",topics:["Kế hoạch ngân sách","Phân tích chỉ số","Báo cáo và tối ưu"]}],
  },
  {
    slug:"quan-tri-kinh-doanh",name:"Quản trị kinh doanh",group:"Kinh doanh",symbol:"business",image:"/pp-academy-campus.webp",
    tagline:"Xây tư duy quản trị. Phát triển năng lực điều hành.",description:"Tìm hiểu cách một tổ chức vận hành thông qua kiến thức quản trị, tài chính căn bản, marketing và phối hợp đội nhóm. Thực hành lập kế hoạch và ra quyết định với các tình huống kinh doanh.",tools:["Business Model","Excel","Quản trị","Thuyết trình"],skills:["Phân tích mô hình kinh doanh và thị trường","Lập kế hoạch nguồn lực và ngân sách cơ bản","Trình bày phương án và phối hợp công việc nhóm"],careers:["Nhân viên kinh doanh","Trợ lý vận hành","Điều phối dự án"],project:"Xây dựng một đề án kinh doanh với khách hàng mục tiêu, sản phẩm, kế hoạch vận hành và dự toán tài chính.",
    stages:[{title:"Hiểu doanh nghiệp",topics:["Nguyên lý quản trị","Marketing căn bản","Tài chính cho người quản lý"]},{title:"Vận hành và con người",topics:["Quản lý nguồn lực","Giao tiếp và đàm phán","Phân tích số liệu kinh doanh"]},{title:"Đề án thực hành",topics:["Mô hình kinh doanh","Kế hoạch triển khai","Thuyết trình và phản biện"]}],
  },
  {
    slug:"logistics",name:"Logistics & Chuỗi cung ứng",group:"Kinh doanh",symbol:"logistics",image:"/pp-academy-campus.webp",
    tagline:"Kết nối dòng hàng hóa. Tối ưu từng mắt xích.",description:"Khám phá cách phối hợp mua hàng, kho, vận tải và phân phối. Tiếp cận tư duy tối ưu quy trình, quản lý chứng từ và theo dõi dữ liệu trong chuỗi cung ứng.",tools:["Excel","Quản lý kho","Vận tải","Supply Chain"],skills:["Mô tả và phân tích quy trình luân chuyển hàng hóa","Theo dõi tồn kho và kế hoạch giao nhận","Đọc dữ liệu vận hành và đề xuất tối ưu"],careers:["Nhân viên logistics","Điều phối vận tải","Nhân viên quản lý kho"],project:"Thiết kế phương án tồn kho và giao nhận cho một doanh nghiệp giả định, kèm bảng theo dõi và phân tích chi phí.",
    stages:[{title:"Tổng quan chuỗi cung ứng",topics:["Dòng hàng hóa và thông tin","Mua hàng và nhà cung cấp","Chứng từ căn bản"]},{title:"Kho và vận tải",topics:["Quản lý tồn kho","Tổ chức giao nhận","Chi phí và chất lượng dịch vụ"]},{title:"Tối ưu vận hành",topics:["Phân tích dữ liệu logistics","Lập kế hoạch nguồn lực","Đề án chuỗi cung ứng"]}],
  },
];

export function mergePrograms(overrides: Program[], images: Record<string,string> = {}): Program[] {
  const merged = new Map<string,Program>(programs.map(program => [program.slug, {...program, published:true, image:images[program.slug] || program.image}]));
  for (const program of overrides) merged.set(program.slug, program);
  return [...merged.values()];
}
